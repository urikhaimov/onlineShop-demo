// apps/api/test/payments.webhook.lowercase-header.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mocks to avoid real GCP auth and keep this test isolated
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __inc: n }) },
}));

const __store = new Map<string, any>();
function patch(cur: any, upd: any) {
  const out: any = { ...cur };
  for (const [k, v] of Object.entries(upd || {})) {
    if (v && typeof v === 'object' && '__inc' in (v as any)) {
      const inc = (v as any).__inc as number;
      out[k] = (typeof out[k] === 'number' ? out[k] : 0) + inc;
    } else {
      out[k] = v;
    }
  }
  return out;
}
function makeDoc(key: string) {
  return {
    async get() {
      const val = __store.get(key);
      return {
        exists: val !== undefined,
        data: () => val,
        get: (f: string) => (val ? val[f] : undefined),
      };
    },
    async set(data: any) {
      __store.set(key, data);
    },
    async update(upd: any) {
      __store.set(key, patch(__store.get(key) || {}, upd));
    },
  };
}

jest.mock('@common/firebase', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => makeDoc(`${name}/${id}`),
    }),
    runTransaction: async (fn: any) => {
      const tx = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
        update: (ref: any, upd: any) => ref.update(upd),
      };
      return fn(tx);
    },
  },
}));

// Optional: avoid any surprise storage usage
jest.mock('firebase-admin/storage', () => ({ getStorage: jest.fn() }));

// SUT
import { PaymentsController } from '../src/payments/payments.controller';
import { MailerService } from '../src/mailer/mailer.service';
import { InvoiceService } from '../src/invoice/invoice.service';

// Local fallback if global helper isn’t present
function applyStripeRawLocal(app: any, route: string) {
  const rawMw = bodyParser.raw({ type: '*/*', limit: '2mb' });
  const ensureRaw = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };
  app.use(route, rawMw, ensureRaw);
  app.use(bodyParser.json());
}

describe('Stripe webhook (lowercase header)', () => {
  let app: INestApplication;
  const webhookSecret = 'whsec_test_123';

  const mailerMock = {
    sendOrderConfirmation: jest.fn(),
    sendRefundEmail: jest.fn(),
  };
  const invoiceMock = {
    generateAndUpload: jest.fn(), // not needed but provided to satisfy DI
  };

  beforeAll(async () => {
    const cfg = new Map<string, any>([
      ['STRIPE_SECRET_KEY', 'sk_test_dummy'],
      ['STRIPE_WEBHOOK_SECRET', webhookSecret],
    ]);
    const configMock: Pick<ConfigService, 'get'> = { get: (k) => cfg.get(k) };

    const mod = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: ConfigService, useValue: configMock },
        { provide: MailerService, useValue: mailerMock },
        { provide: InvoiceService, useValue: invoiceMock },
      ],
    }).compile();

    app = mod.createNestApplication({ rawBody: true });

    const apiPrefix = process.env.API_PREFIX ?? 'api';
    app.setGlobalPrefix(apiPrefix);

    const applyStripeRaw =
      (global as any).applyStripeRaw ?? applyStripeRawLocal;
    applyStripeRaw(app, `/${apiPrefix}/payments/webhooks/stripe`);

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('accepts lowercase stripe-signature header', async () => {
    const apiPrefix = process.env.API_PREFIX ?? 'api';

    const payload = {
      id: 'evt_lower_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_lower_1',
          object: 'payment_intent',
          amount: 1234,
          amount_received: 1234,
          currency: 'usd',
          metadata: { cartId: 'cart-lower-1' }, // minimal; no items to avoid stock updates
        },
      },
    };

    const raw = JSON.stringify(payload);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: webhookSecret,
      timestamp: Math.floor(Date.now() / 1000),
    });

    await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/webhooks/stripe`)
      .set('stripe-signature', header) // lowercase header only
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(200);
  });
});
