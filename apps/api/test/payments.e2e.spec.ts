// apps/api/test/payments.e2e.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import Stripe from 'stripe';
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

// ✅ Only the controller — avoid full AppModule to prevent long init/hangs
import { PaymentsController } from '../src/payments/payments.controller';

// Firestore mock must be defined BEFORE the controller is imported (we already imported controller above,
// but controller does a runtime import of @common/firebase; Jest hoists mocks so this is still OK)
jest.mock('@common/firebase', () => {
  const adminDb = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    runTransaction: jest.fn(),
  };
  return { adminDb };
});

import { adminDb } from '@common/firebase';

type AdminDbMock = {
  collection: jest.Mock;
  doc: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  update: jest.Mock;
  runTransaction: jest.Mock;
};
const db = adminDb as unknown as AdminDbMock;

jest.setTimeout(60_000);

function listRoutes(app: INestApplication) {
  const httpAdapter: any = (app as any).getHttpAdapter?.();
  const instance: any =
    httpAdapter?.getInstance?.() ??
    httpAdapter?.getHttpServer?.() ??
    (app as any).getHttpServer?.();

  const out: Array<{ method: string; path: string }> = [];
  const router = instance?._router;

  function walk(stack: any[], base = '') {
    for (const layer of stack || []) {
      if (layer.route?.path) {
        const methods = Object.keys(layer.route.methods).filter(
          (m) => layer.route.methods[m],
        );
        for (const m of methods) {
          out.push({ method: m.toUpperCase(), path: base + layer.route.path });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack, base);
      }
    }
  }

  if (router?.stack) walk(router.stack);
  return out;
}

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let createIntentPath = '';
  let webhookPath = '';
  const webhookSecret = 'whsec_test_123';

  // controller instance (cast to any to access private stripe field)
  let ctrl: any;

  beforeAll(() => {
    nock.cleanAll();
    nock.abortPendingRequests();
    nock.disableNetConnect();
    // allow supertest to hit local HTTP server
    nock.enableNetConnect(/^(127\.0\.0\.1|localhost|\[::1\]|::1)(:\d+)?$/);
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  beforeAll(async () => {
    // minimal config provider used by PaymentsController
    const cfg = new Map<string, any>([
      ['STRIPE_SECRET_KEY', 'sk_test_dummy'],
      ['STRIPE_WEBHOOK_SECRET', webhookSecret],
    ]);
    const configMock: Pick<ConfigService, 'get'> = {
      get: (k: string) => cfg.get(k),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: ConfigService, useValue: configMock }],
    }).compile();

    const apiPrefix = process.env.API_PREFIX ?? 'api';
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix(apiPrefix);

    // 🔐 Ensure Stripe webhook sees the exact raw body (mirror main.ts)
    // Use type '*/*' so Express gives us the raw Buffer for any content-type.
    const stripeRaw = bodyParser.raw({ type: '*/*', limit: '2mb' });
    const ensureRawBody = (req: any, _res: any, next: any) => {
      if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
      next();
    };
    // Mount on the expected prefixed path before init
    app.use(`/${apiPrefix}/payments/webhooks/stripe`, stripeRaw, ensureRawBody);

    await app.init();

    // discover the two routes we need
    const routes = listRoutes(app);
    createIntentPath =
      routes.find(
        (r) =>
          r.method === 'POST' &&
          /\/payments\/(create-intent|create-payment-intent|intent)$/i.test(
            r.path,
          ),
      )?.path ?? '/payments/create-intent';

    webhookPath =
      routes.find(
        (r) =>
          r.method === 'POST' &&
          /stripe/i.test(r.path) &&
          /webhooks?/i.test(r.path),
      )?.path ?? '/payments/webhooks/stripe';

    // 🔧 ensure discovered paths include the global prefix
    const withPrefix = (p: string) => {
      const norm = p.startsWith('/') ? p : `/${p}`;
      return norm.startsWith(`/${apiPrefix}/`) || norm === `/${apiPrefix}`
        ? norm
        : `/${apiPrefix}${norm}`;
    };
    createIntentPath = withPrefix(createIntentPath);
    webhookPath = withPrefix(webhookPath);

    // Also mount on the discovered path (in case it differs)
    app.use(webhookPath, stripeRaw, ensureRawBody);

    // get controller instance so we can spy on Stripe client methods
    ctrl = app.get(PaymentsController) as any;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    nock.abortPendingRequests();
    nock.cleanAll();
  });

  it('POST /payments/create-intent returns clientSecret + paymentIntentId', async () => {
    // Mock Firestore data for amount computation
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    // Safe default for any unexpected reads
    db.get = jest.fn().mockResolvedValue({ get: () => null });
    // product 1 price 50, product 2 price 30, settings: shipping 10, tax 0, discount 0
    (db.get as jest.Mock)
      .mockResolvedValueOnce({
        get: (f: string) => (f === 'price' ? 50 : null),
      }) // product 1
      .mockResolvedValueOnce({
        get: (f: string) => (f === 'price' ? 30 : null),
      }) // product 2
      .mockResolvedValueOnce({
        get: (f: string) =>
          f === 'shipping'
            ? 10
            : f === 'taxRate'
              ? 0
              : f === 'discount'
                ? 0
                : null,
      }); // settings

    // 🔒 Avoid real network: spy on the controller's Stripe client directly
    const createSpy = jest
      .spyOn((ctrl as any).stripe.paymentIntents, 'create')
      .mockResolvedValue({
        id: 'pi_123',
        client_secret: 'cs_test_123',
      } as any);

    const res = await request(app.getHttpServer())
      .post(createIntentPath)
      .send({
        cartId: 'cart-1',
        items: [
          { id: '1', qty: 1 },
          { id: '2', qty: 2 },
        ],
        currency: 'ILS',
        customerEmail: 'a@b.com',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toEqual({
      clientSecret: 'cs_test_123',
      paymentIntentId: 'pi_123',
    });

    // Assert the Stripe call parameters (cast the call tuple)
    const [params, options] = createSpy.mock.calls[0] as [any, any];
    expect(params).toMatchObject({
      amount: 12000, // (50*1 + 30*2 + 10) * 100
      currency: 'ils',
      metadata: { cartId: 'cart-1' },
    });
    expect(options).toMatchObject({ idempotencyKey: 'pi_cart-1' });
  });

  it('POST /payments/webhooks/stripe verifies signature and upserts order (succeeded)', async () => {
    const eventPayload = {
      id: 'evt_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_abc',
          object: 'payment_intent',
          amount: 12000,
          amount_received: 12000,
          currency: 'ils',
          metadata: { cartId: 'cart-1' },
        },
      },
    };
    const payloadRaw = JSON.stringify(eventPayload);

    // Valid Stripe signature header
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: payloadRaw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => ({ exists: false, get: () => null })),
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
      expect(tx.set).toHaveBeenCalled(); // order created
      return true;
    });

    await request(app.getHttpServer())
      .post(webhookPath) // ✅ normalized & prefixed
      .set('Stripe-Signature', header)
      .set('stripe-signature', header) // some code reads lowercase key
      .set('Content-Type', 'application/json')
      .send(payloadRaw) // send exact string so signature matches
      .expect(200);
  });

  it('rejects bad webhook signatures', async () => {
    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', 'bad')
      .set('Content-Type', 'application/json')
      .send('{}'); // plain string

    expect(res.status).toBe(400);
  });
});
