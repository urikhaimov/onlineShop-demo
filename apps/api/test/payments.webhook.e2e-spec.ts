/// <reference types="jest" />
// apps/api/test/payments.webhook.e2e-spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import Stripe from 'stripe';
import * as bodyParser from 'body-parser';
import { MailerService } from '../src/mailer/mailer.service'; // ✅ use class token

// ---- Mock FieldValue.increment so we can apply stock math in our fake DB
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (n: number) => ({ __incrementBy: n }),
  },
}));

// ---- Mock @common/firebase (in-memory) + expose store for assertions
jest.mock('@common/firebase', () => {
  const store = new Map<string, any>();

  function applyPatch(cur: any, patch: any) {
    const next: any = { ...cur };
    for (const [k, v] of Object.entries(patch || {})) {
      if (v && typeof v === 'object' && '__incrementBy' in (v as any)) {
        const inc = (v as any).__incrementBy as number;
        const curVal = typeof next[k] === 'number' ? (next[k] as number) : 0;
        next[k] = curVal + inc;
      } else {
        next[k] = v;
      }
    }
    return next;
  }

  function makeDoc(key: string) {
    return {
      async get() {
        const val = store.get(key);
        return {
          exists: val !== undefined,
          get: (field: string) => (val ? val[field] : undefined),
          data: () => val,
        };
      },
      async set(data: any) {
        store.set(key, data);
      },
      async update(patch: any) {
        const cur = store.get(key) || {};
        store.set(key, applyPatch(cur, patch));
      },
    };
  }

  return {
    _getStore: () => store, // test-only
    adminDb: {
      collection: (name: string) => ({
        doc: (id: string) => makeDoc(`${name}/${id}`),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any) => ref.set(data),
          update: (ref: any, patch: any) => ref.update(patch),
        };
        return fn(tx);
      },
    },
  };
});

import * as FirebaseMock from '@common/firebase'; // access _getStore/adminDb

describe('Stripe Webhook (raw body + signature)', () => {
  let app: INestApplication;
  const secret = 'whsec_test_123';
  const stripe = new Stripe('sk_test_dummy', {
    apiVersion: '2025-07-30.basil' as Stripe.LatestApiVersion,
  });
  const route = '/api/payments/webhooks/stripe';

  // test mailer
  const mailer: Pick<
    MailerService,
    'sendOrderConfirmation' | 'sendRefundEmail'
  > = {
    sendOrderConfirmation: jest.fn(),
    sendRefundEmail: jest.fn(),
  };

  // helper: return Supertest Test (not async) so `.expect()` works
  const postSigned = (type: string, object: Record<string, any>) => {
    const payload = { id: `evt_${type}_${Date.now()}`, type, data: { object } };
    const payloadString = JSON.stringify(payload);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });
    return request(app.getHttpServer())
      .post(route)
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payloadString);
  };

  beforeAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    const { PaymentsModule } = await import('../src/payments/payments.module');
    const moduleRef = await Test.createTestingModule({
      imports: [PaymentsModule],
    })
      // ✅ ensure PaymentsController receives our mock mailer (class token)
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();

    // expose req.rawBody
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');

    // ✅ Mount raw body parser for the webhook route BEFORE json()
    const rawMw = bodyParser.raw({ type: '*/*', limit: '2mb' });
    const ensureRaw = (req: any, _res: any, next: any) => {
      if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
      next();
    };
    app.use(route, rawMw, ensureRaw);

    // ✅ JSON for all other routes
    app.use(bodyParser.json());

    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a properly signed event', async () => {
    const payload = {
      id: 'pi_123',
      amount: 5000,
      currency: 'ils',
      metadata: { cartId: 'cart_ok_1', email: 'user@example.com' },
    };

    const res = await postSigned('payment_intent.succeeded', payload).expect(
      200,
    );
    expect(res.body).toEqual({ received: true });

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const order = store.get('orders/cart_ok_1');
    expect(order?.status).toBe('paid');
    expect(order?.paymentIntentId).toBe('pi_123');
  });

  it('rejects an invalid signature', async () => {
    const payloadString = JSON.stringify({ hello: 'world' });

    await request(app.getHttpServer())
      .post(route)
      .set('stripe-signature', 't=123,v1=deadbeef')
      .set('Content-Type', 'application/json')
      .send(payloadString)
      .expect(400);
  });

  it('updates existing order to payment_failed', async () => {
    const { adminDb } = FirebaseMock as any;
    await adminDb
      .collection('orders')
      .doc('cart_fail_1')
      .set({
        status: 'pending',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });

    await postSigned('payment_intent.payment_failed', {
      id: 'pi_fail_1',
      status: 'requires_payment_method',
      last_payment_error: { code: 'card_declined' },
      metadata: { cartId: 'cart_fail_1' },
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const order = store.get('orders/cart_fail_1');
    expect(order?.status).toBe('payment_failed');
    expect(order?.lastError).toBe('card_declined');
  });

  it('updates existing order to canceled', async () => {
    const { adminDb } = FirebaseMock as any;
    await adminDb
      .collection('orders')
      .doc('cart_cancel_1')
      .set({
        status: 'pending',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });

    await postSigned('payment_intent.canceled', {
      id: 'pi_cancel_1',
      status: 'canceled',
      metadata: { cartId: 'cart_cancel_1' },
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const order = store.get('orders/cart_cancel_1');
    expect(order?.status).toBe('canceled');
  });

  it('handles charge.refunded (full refund)', async () => {
    await postSigned('payment_intent.succeeded', {
      id: 'pi_full_1',
      amount: 10000,
      currency: 'ils',
      metadata: { cartId: 'cart_refund_full_1', email: 'buyer@ex.com' },
    }).expect(200);

    await postSigned('charge.refunded', {
      id: 'ch_full_1',
      amount: 10000,
      amount_refunded: 10000,
      currency: 'ils',
      payment_intent: 'pi_full_1',
      metadata: { cartId: 'cart_refund_full_1', email: 'buyer@ex.com' },
      refunds: { data: [{ id: 're_1' }, { id: 're_2' }] },
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const order = store.get('orders/cart_refund_full_1');
    expect(order?.status).toBe('refunded');
    expect(order?.refundedAmount).toBe(10000);
    expect(order?.refundIds).toEqual(['re_1', 're_2']);
  });

  it('handles charge.refunded (partial refund)', async () => {
    await postSigned('payment_intent.succeeded', {
      id: 'pi_part_1',
      amount: 15000,
      currency: 'ils',
      metadata: { cartId: 'cart_refund_part_1', email: 'buyer@ex.com' },
    }).expect(200);

    await postSigned('charge.refunded', {
      id: 'ch_part_1',
      amount: 15000,
      amount_refunded: 5000,
      currency: 'ils',
      payment_intent: 'pi_part_1',
      metadata: { cartId: 'cart_refund_part_1', email: 'buyer@ex.com' },
      refunds: { data: [{ id: 're_partial_1' }] },
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const order = store.get('orders/cart_refund_part_1');
    expect(order?.status).toBe('partially_refunded');
    expect(order?.refundedAmount).toBe(5000);
    expect(order?.refundIds).toEqual(['re_partial_1']);
  });

  it('decrements stock based on items metadata and sends confirmation email', async () => {
    const { adminDb } = FirebaseMock as any;

    // Seed product with stock and price (price used by create-intent in real flow, not here)
    await adminDb
      .collection('products')
      .doc('p1')
      .set({ stock: 10, price: 5000 });

    // Fire a successful payment with metadata.items
    await postSigned('payment_intent.succeeded', {
      id: 'pi_stock_1',
      amount: 5000,
      currency: 'ils',
      metadata: {
        cartId: 'cart_stock_1',
        email: 'buyer@example.com',
        items: JSON.stringify([{ id: 'p1', qty: 2 }]),
      },
      receipt_email: 'buyer@example.com',
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const product = store.get('products/p1');
    expect(product?.stock).toBe(8); // 10 - 2

    // sendOrderConfirmation was called once with expected payload
    expect(mailer.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const [to, payload] = (mailer.sendOrderConfirmation as jest.Mock).mock
      .calls[0];
    expect(to).toBe('buyer@example.com');
    expect(payload.orderId).toBe('cart_stock_1');
    expect(payload.paymentIntentId).toBe('pi_stock_1');
    expect(typeof payload.amount).toBe('number');
  });

  it('duplicate succeeded event keeps createdAt stable (no order recreation)', async () => {
    const cartId = 'cart_dup_1';
    const piId = 'pi_dup_1';

    await postSigned('payment_intent.succeeded', {
      id: piId,
      amount: 7000,
      currency: 'ils',
      metadata: { cartId, email: 'dup@ex.com' },
    }).expect(200);

    const store = (FirebaseMock as any)._getStore() as Map<string, any>;
    const before = store.get(`orders/${cartId}`);
    const createdAt1 = before?.createdAt;

    await postSigned('payment_intent.succeeded', {
      id: piId,
      amount: 7000,
      currency: 'ils',
      metadata: { cartId, email: 'dup@ex.com' },
    }).expect(200);

    const after = store.get(`orders/${cartId}`);
    expect(new Date(after?.createdAt).toISOString()).toBe(
      new Date(createdAt1).toISOString(),
    );
  });
});
