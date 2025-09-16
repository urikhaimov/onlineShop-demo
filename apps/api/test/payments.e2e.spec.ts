import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import request from 'supertest';
import Stripe from 'stripe';
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks that must be hoisted
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('firebase-admin/storage', () => ({ getStorage: jest.fn() }));

// ✅ Only the controller — avoid full AppModule to prevent long init/hangs
import { PaymentsController } from '../src/payments/payments.controller';
import { MailerService } from '../src/mailer/mailer.service'; // 👈 use class token
import { InvoiceService } from '../src/invoice/invoice.service'; // 👈 use class token
import { Readable } from 'stream';

// 🔒 Local alias (with fallback) for rate-limit toggling; works with or without jest.setup.ts
const withRateLimitEnabled: <T>(fn: () => Promise<T> | T) => Promise<T> =
  (global as any).withRateLimitEnabled ??
  (async (fn) => {
    const prev = process.env.DISABLE_RATE_LIMIT;
    try {
      process.env.DISABLE_RATE_LIMIT = 'false';
      return await fn();
    } finally {
      process.env.DISABLE_RATE_LIMIT = prev ?? 'true';
    }
  });

// Firestore mock must be defined BEFORE the controller is imported (we already imported controller above,
// but controller does a runtime import of @common/firebase; Jest hoists mocks so this is still OK)
jest.mock('@common/firebase', () => {
  const adminDb = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(), // <- used for docRef.get()
    set: jest.fn(),
    update: jest.fn(), // <- used for docRef.update(payload) and tx.update(ref, payload)
    runTransaction: jest.fn(),
  };
  return { adminDb };
});

import { adminDb } from '@common/firebase';

type AdminDbMock = {
  collection: jest.Mock;
  doc: jest.Mock;
  get: jest.Mock; // docRef.get()
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

// Helper to make a DocumentSnapshot-like object
const makeSnap = (data: any, exists = true) => ({
  exists,
  data: () => data,
  get: (field: string) => (data ? data[field] : null),
});

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let createIntentPath = '';
  let webhookPath = '';
  const webhookSecret = 'whsec_test_123';

  // controller instance (cast to any to access private stripe field)
  let ctrl: any;
  let throttleStore: ThrottlerStorageService | undefined;

  // 📧 mailer mock so we can assert emails are sent on success/refund
  const mailerMock = {
    sendOrderConfirmation: jest.fn(),
    sendRefundEmail: jest.fn(),
  };

  // 📄 invoice mock so we can assert PDF generation/upload & persistence
  const invoiceMock = {
    generateAndUpload: jest.fn(),
  };

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
      // 👇 added for public config test
      ['STRIPE_PUBLISHABLE_KEY', 'pk_live_ABCDEF1234567890'],
      ['DEFAULT_CURRENCY', 'ILS'],
    ]);
    const configMock: Pick<ConfigService, 'get'> = {
      get: (k: string) => cfg.get(k),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        // Enable throttling in the test app (10 req / 60s)
        ThrottlerModule.forRoot({
          // Newer throttler versions expect a list of throttlers
          throttlers: [{ ttl: 60, limit: 10 }],
        }),
      ],
      controllers: [PaymentsController],
      providers: [
        { provide: ConfigService, useValue: configMock },
        { provide: MailerService, useValue: mailerMock }, // 👈 provide class token
        { provide: InvoiceService, useValue: invoiceMock }, // 👈 provide invoice mock
        // Apply throttler as a global guard
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    const apiPrefix = process.env.API_PREFIX ?? 'api';
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix(apiPrefix);

    // Trust X-Forwarded-For so throttler buckets by client IP in tests/CI
    const server = app.getHttpAdapter().getInstance?.();
    server?.set?.('trust proxy', true);

    // 🔐 Ensure Stripe webhook sees the exact raw body (mirror main.ts)
    const stripeRaw = bodyParser.raw({ type: '*/*', limit: '2mb' });
    const ensureRawBody = (req: any, _res: any, next: any) => {
      if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
      next();
    };
    // Mount on the expected prefixed path before init
    app.use(`/${apiPrefix}/payments/webhooks/stripe`, stripeRaw, ensureRawBody);

    // 👇 also mount JSON parser AFTER raw for other routes (e.g., create-intent)
    app.use(bodyParser.json());

    await app.init();

    // Keep a handle to the throttler storage to clear between tests
    try {
      throttleStore = app.get(ThrottlerStorageService);
    } catch {
      // ignore if not resolvable
    }

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
    invoiceMock.generateAndUpload.mockReset();

    // 🔁 Reset docRef.get() to a sane default (prevents "snap.data is not a function")
    db.get = jest.fn().mockResolvedValue(makeSnap({}));

    // 🧹 Clear rate-limit buckets between tests for determinism
    try {
      // Default storage uses a Map; optional-chain guards different impls
      (throttleStore as any)?.storage?.clear?.();
    } catch {
      /* no-op */
    }
  });

  it('POST /payments/create-intent returns clientSecret + paymentIntentId', async () => {
    // Mock Firestore data for amount computation
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    // For product/settings reads, we want a DocumentSnapshot with only .get(field)
    db.get = jest.fn().mockResolvedValue({ get: () => null } as any);
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

    const header = Stripe.webhooks.generateTestHeaderString({
      payload: payloadRaw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)),
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
      expect(tx.set).toHaveBeenCalled(); // order created
      return true;
    });

    await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(payloadRaw)
      .expect(200);
  });

  it('rejects bad webhook signatures', async () => {
    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', 'bad')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
  });

  it('create-intent is idempotent per cartId (same idempotencyKey)', async () => {
    const spy = jest
      .spyOn((ctrl as any).stripe.paymentIntents, 'create')
      .mockResolvedValueOnce({ id: 'pi_A', client_secret: 'cs_A' } as any)
      .mockResolvedValueOnce({ id: 'pi_B', client_secret: 'cs_B' } as any);

    const payload = {
      cartId: 'cart-42',
      items: [{ id: '1', qty: 1 }],
      currency: 'ILS',
      customerEmail: 'u@x.com',
    };

    const r1 = await request(app.getHttpServer())
      .post(createIntentPath)
      .send(payload);
    const r2 = await request(app.getHttpServer())
      .post(createIntentPath)
      .send(payload);

    expect([200, 201]).toContain(r1.status);
    expect([200, 201]).toContain(r2.status);

    const idks = spy.mock.calls.map(
      ([, opts]: [unknown, { idempotencyKey?: string }]) =>
        opts?.idempotencyKey,
    );
    expect(new Set(idks).size).toBe(1);
    expect(idks[0]).toBe('pi_cart-42');
  });

  it('webhook is idempotent (duplicate delivery does not create twice)', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    let exists = false;
    let setCallsTotal = 0;
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, exists)),
        set: jest.fn(() => {
          setCallsTotal++;
        }),
        update: jest.fn(),
      };
      await fn(tx);
      exists = true; // next time behave as "already processed / existing order"
      return true;
    });

    // Ensure any accidental docRef.get() (outside tx) won’t blow up
    db.get = jest.fn().mockResolvedValue(makeSnap({}));

    const eventPayload = {
      id: 'evt_same',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_same',
          object: 'payment_intent',
          amount: 100,
          currency: 'ils',
          metadata: { cartId: 'cart-dup' },
        },
      },
    };
    const raw = JSON.stringify(eventPayload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    // first delivery -> creates
    await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(200);

    // duplicate delivery -> should be 200 but not create again
    await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(200);

    expect(setCallsTotal).toBe(1);
  });

  it('payment_intent.payment_failed does NOT create order (friendly fail path)', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    let setCalls = 0;
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)),
        set: jest.fn(() => {
          setCalls++;
        }),
        update: jest.fn(),
      };
      await fn(tx);
      return true;
    });

    const failed = {
      id: 'evt_fail_1',
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail',
          object: 'payment_intent',
          amount: 100,
          currency: 'ils',
          last_payment_error: { code: 'insufficient_funds' },
        },
      },
    };
    const raw = JSON.stringify(failed);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(setCalls).toBe(0);
  });

  it('charge.refunded (full) updates order to refunded with amount', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    let lastUpdate: any = null;
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, true)), // already has an order
        set: jest.fn(),
        update: jest.fn((_ref: any, payload: any) => {
          lastUpdate = payload;
        }),
      };
      await fn(tx);
      return true;
    });

    const chargePayload = {
      id: 'ch_1',
      object: 'charge',
      amount: 12000,
      amount_refunded: 12000,
      currency: 'ils',
      payment_intent: 'pi_abc',
      refunds: {
        data: [{ id: 're_1', amount: 12000 }],
        total_count: 1,
        object: 'list',
        url: '',
      },
    };
    const raw = JSON.stringify({
      id: 'evt_ref_full',
      object: 'event',
      type: 'charge.refunded',
      data: { object: chargePayload },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(lastUpdate).toBeTruthy();
    expect(lastUpdate.status).toBe('refunded');
    expect(lastUpdate.refundedAmount).toBe(12000);
  });

  it('charge.refunded (partial) updates order to partially_refunded with amount', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    let lastUpdate: any = null;
    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, true)),
        set: jest.fn(),
        update: jest.fn((_ref: any, payload: any) => {
          lastUpdate = payload;
        }),
      };
      await fn(tx);
      return true;
    });

    const chargePayload = {
      id: 'ch_2',
      object: 'charge',
      amount: 12000,
      amount_refunded: 3000,
      currency: 'ils',
      payment_intent: 'pi_def',
      refunds: {
        data: [{ id: 're_2', amount: 3000 }],
        total_count: 1,
        object: 'list',
        url: '',
      },
    };
    const raw = JSON.stringify({
      id: 'evt_ref_partial',
      object: 'event',
      type: 'charge.refunded',
      data: { object: chargePayload },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(lastUpdate).toBeTruthy();
    expect(lastUpdate.status).toBe('partially_refunded');
    expect(lastUpdate.refundedAmount).toBe(3000);
  });

  it('succeeded webhook decrements stock atomically with order write', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    let setCalled = false;
    let stockUpdates = 0;

    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)), // order does not exist yet
        set: jest.fn(() => {
          setCalled = true;
        }),
        update: jest.fn((_ref: any, payload: any) => {
          if (
            payload &&
            Object.prototype.hasOwnProperty.call(payload, 'stock')
          ) {
            stockUpdates++;
          }
        }),
      };
      await fn(tx);
      return true;
    });

    const eventPayload = {
      id: 'evt_stock_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_stock_1',
          object: 'payment_intent',
          amount: 12000,
          amount_received: 12000,
          currency: 'ils',
          metadata: {
            cartId: 'cart-stock',
            items: JSON.stringify([
              { id: '1', qty: 1 },
              { id: '2', qty: 2 },
            ]),
          },
        },
      },
    };
    const raw = JSON.stringify(eventPayload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(setCalled).toBe(true);
    expect(stockUpdates).toBeGreaterThan(0);
  });

  // 📧 EMAIL TESTS
  // 📧 EMAIL TESTS
  it('success webhook sends order confirmation email when metadata.email is present', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)),
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
      return true;
    });

    mailerMock.sendOrderConfirmation.mockClear();

    const eventPayload = {
      id: 'evt_mail_ok',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_mail_1',
          object: 'payment_intent',
          amount: 12000,
          amount_received: 12000,
          currency: 'ils',
          metadata: {
            cartId: 'cart-mail',
            items: JSON.stringify([{ id: '1', qty: 1 }]),
            email: 'buyer@example.com',
          },
        },
      },
    };
    const raw = JSON.stringify(eventPayload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(mailerMock.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(mailerMock.sendOrderConfirmation).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({
        orderId: 'cart-mail',
        amount: 12000,
        currency: expect.stringMatching(/^ils$/i),
        paymentIntentId: 'pi_mail_1',
      }),
      // Option A: 3rd arg exists; here it’s undefined because no invoice/attachments
      undefined,
    );
  });

  it('refund webhook sends refund email when charge.metadata.email is present', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, true)),
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
      return true;
    });

    mailerMock.sendRefundEmail.mockClear();

    const chargePayload = {
      id: 'ch_mail_2',
      object: 'charge',
      amount: 12000,
      amount_refunded: 3000,
      currency: 'ils',
      payment_intent: 'pi_mail_2',
      metadata: { email: 'buyer@example.com', cartId: 'cart-mail' },
      refunds: {
        data: [{ id: 're_200', amount: 3000 }],
        total_count: 1,
        object: 'list',
        url: '',
      },
    };
    const raw = JSON.stringify({
      id: 'evt_mail_refund',
      object: 'event',
      type: 'charge.refunded',
      data: { object: chargePayload },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);
    expect(mailerMock.sendRefundEmail).toHaveBeenCalledTimes(1);
    expect(mailerMock.sendRefundEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({
        orderId: 'cart-mail',
        amount: 3000,
        currency: 'ils',
        chargeId: 'ch_mail_2',
        full: false,
        refundIds: ['re_200'],
      }),
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // NEW: Invoice generation + persistence + email link/attachment + download
  // ────────────────────────────────────────────────────────────────────────────

  it('on succeeded: generates invoice, persists pointer, and emails link + attachment', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)),
        set: jest.fn(),
        update: jest.fn(), // stock updates happen here
      };
      await fn(tx);
      return true;
    });

    const pdfBuf = Buffer.from('%PDF-invoice-bytes%');
    const invoiceUrl = 'https://signed.example/inv_cart-inv-1.pdf';

    invoiceMock.generateAndUpload.mockResolvedValueOnce({
      buffer: pdfBuf,
      path: 'invoices/cart-inv-1.pdf',
      url: invoiceUrl,
    });

    mailerMock.sendOrderConfirmation.mockClear();
    db.update.mockClear?.();

    const eventPayload = {
      id: 'evt_inv_ok',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_inv_1',
          object: 'payment_intent',
          amount: 5000,
          amount_received: 5000,
          currency: 'ils',
          metadata: {
            cartId: 'cart-inv-1',
            email: 'buyer@example.com',
            items: JSON.stringify([{ id: '1', qty: 1 }]),
          },
        },
      },
    };
    const raw = JSON.stringify(eventPayload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);

    // 1) Invoice generated with proper args
    expect(invoiceMock.generateAndUpload).toHaveBeenCalledTimes(1);
    expect(invoiceMock.generateAndUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'cart-inv-1',
        amountCents: 5000,
        currency: 'ILS', // uppercased by controller
        email: 'buyer@example.com',
      }),
    );

    // 2) Order doc updated with invoice pointer (outside tx → one-arg update(payload))
    const singleArgUpdateCall = (db.update as jest.Mock).mock.calls.find(
      (c) => c.length === 1,
    );
    expect(singleArgUpdateCall).toBeDefined();
    const persisted = singleArgUpdateCall![0];

    // ✅ Expect nested "invoice" object (matches controller) + ignore updatedAt noise
    expect(persisted).toEqual(
      expect.objectContaining({
        invoice: expect.objectContaining({
          path: 'invoices/cart-inv-1.pdf',
          url: invoiceUrl,
        }),
      }),
    );

    // 3) Email sent with link + attachment
    expect(mailerMock.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const [to, payload, opts] = mailerMock.sendOrderConfirmation.mock.calls[0];

    expect(to).toBe('buyer@example.com');
    expect(payload).toEqual(
      expect.objectContaining({
        orderId: 'cart-inv-1',
        paymentIntentId: 'pi_inv_1',
        amount: 5000,
        currency: 'ILS',
        invoiceUrl,
      }),
    );
    expect(opts).toEqual(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            filename: 'invoice_cart-inv-1.pdf',
            content: pdfBuf,
            contentType: 'application/pdf',
          }),
        ],
      }),
    );
  });

  it('succeeded webhook still emails if invoice generation fails (no link/attachment)', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    db.runTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        get: jest.fn(async () => makeSnap({}, false)),
        set: jest.fn(),
        update: jest.fn(),
      };
      await fn(tx);
      return true;
    });

    invoiceMock.generateAndUpload.mockRejectedValueOnce(new Error('boom'));

    mailerMock.sendOrderConfirmation.mockClear();

    const eventPayload = {
      id: 'evt_inv_fail',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_noinv_1',
          object: 'payment_intent',
          amount: 7000,
          amount_received: 7000,
          currency: 'ils',
          metadata: { cartId: 'cart-noinv-1', email: 'buyer@example.com' },
        },
      },
    };
    const raw = JSON.stringify(eventPayload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const res = await request(app.getHttpServer())
      .post(webhookPath)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw);

    expect([200, 204]).toContain(res.status);

    // Email still sent…
    expect(mailerMock.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const [, payload, opts] = mailerMock.sendOrderConfirmation.mock.calls[0];

    // …without invoiceUrl or attachments
    expect(payload.invoiceUrl).toBeUndefined();
    expect(opts).toBeUndefined();
  });

  it('GET /payments/orders/:orderId/invoice streams the PDF', async () => {
    const { getStorage } = require('firebase-admin/storage') as {
      getStorage: jest.Mock;
    };
    const pdf = Buffer.from('%PDF-1.4\n%invoice bytes\n');

    // Mock Storage → bucket → file(path) → exists() + createReadStream()
    getStorage.mockReturnValue({
      bucket: () => ({
        file: (_path: string) => ({
          exists: async () => [true],
          createReadStream: () => Readable.from(pdf),
        }),
      }),
    });

    const pref = process.env.API_PREFIX ?? 'api';
    const orderId = 'order-dl-1';

    const res = await request(app.getHttpServer())
      .get(`/${pref}/payments/orders/${orderId}/invoice`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toContain(
      `invoice_${orderId}.pdf`,
    );
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).equals(pdf)).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Public config, rate-limit, and prod-key guard
  // ────────────────────────────────────────────────────────────────────────────

  it('GET /payments/config/public returns masked publishable key', async () => {
    const pref = process.env.API_PREFIX ?? 'api';
    const res = await request(app.getHttpServer()).get(
      `/${pref}/payments/config/public`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        publishableKeyMasked: expect.any(String),
        defaultCurrency: expect.any(String),
      }),
    );
    expect(res.body.publishableKeyMasked).toContain('…7890');
    expect(res.body.publishableKeyMasked.length).toBeGreaterThanOrEqual(11);
  });

  it('rate-limits create-intent bursts (10/min/IP)', async () => {
    await withRateLimitEnabled(async () => {
      jest
        .spyOn((ctrl as any).stripe.paymentIntents, 'create')
        .mockResolvedValue({ id: 'pi_rate', client_secret: 'cs_rate' } as any);

      db.collection.mockReturnThis();
      db.doc.mockReturnThis();
      db.get = jest.fn().mockResolvedValue({ get: () => null }); // settings lookups return 0s

      const ip = '203.0.113.42';
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        const r = await request(app.getHttpServer())
          .post(createIntentPath)
          .set('X-Forwarded-For', ip)
          .send({ cartId: `burst-${i}`, items: [], currency: 'ILS' });
        statuses.push(r.status);
      }

      expect(statuses.slice(0, 10).every((s) => [200, 201].includes(s))).toBe(
        true,
      );
      expect(statuses[10]).toBe(429);
    });
  });

  it('throws in production when STRIPE_SECRET_KEY is a test key', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const cfg = new Map<string, any>([
      ['STRIPE_SECRET_KEY', 'sk_test_abc123'],
      ['STRIPE_WEBHOOK_SECRET', 'whsec_abc'],
    ]);
    const configMock: Pick<ConfigService, 'get'> = {
      get: (k: string) => cfg.get(k),
    };

    await expect(
      Test.createTestingModule({
        controllers: [PaymentsController],
        providers: [
          { provide: ConfigService, useValue: configMock },
          // Provide InvoiceService to avoid DI error overshadowing the intended throw
          {
            provide: InvoiceService,
            useValue: { generateAndUpload: jest.fn() },
          },
        ],
      }).compile(),
    ).rejects.toThrow(/Test key used in production/i);

    process.env.NODE_ENV = oldEnv;
  });
});
