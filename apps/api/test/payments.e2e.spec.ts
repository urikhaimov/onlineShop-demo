import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import request from 'supertest'; // ✅ default import, not namespace
import Stripe from 'stripe';

// IMPORTANT: mock Firestore BEFORE importing AppModule
jest.mock('@common/firebase');

import { AppModule } from '../src/app/app.module';
import { adminDb } from '@common/firebase';

// Create a typed handle to the jest mock version of adminDb
type AdminDbMock = {
  collection: jest.Mock;
  doc: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  update: jest.Mock;
  runTransaction: jest.Mock;
};
const db = adminDb as unknown as AdminDbMock; // ✅ cast to the mocked shape

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  const apiPrefix = 'api';
  const webhookSecret = 'whsec_test_123';

  beforeAll(async () => {
    process.env.API_PREFIX = apiPrefix;
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true } as any);

    // Mount raw parser ONLY for the Stripe webhook route (must match main.ts)
    app.use(
      `/${apiPrefix}/payments/webhooks/stripe`,
      bodyParser.raw({ type: 'application/json' }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /payments/create-intent returns clientSecret + paymentIntentId', async () => {
    // Mock Firestore reads/writes for computeAmount + checkout draft
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();

    // products/1 -> price 50, products/2 -> price 30, settings/order -> shipping 10
    db.get
      .mockResolvedValueOnce({
        get: (f: string) => (f === 'price' ? 50 : null),
      }) // product 1
      .mockResolvedValueOnce({
        get: (f: string) => (f === 'price' ? 30 : null),
      }) // product 2
      .mockResolvedValueOnce({
        get: (f: string) => {
          if (f === 'shipping') return 10;
          if (f === 'taxRate') return 0;
          if (f === 'discount') return 0;
          return null;
        },
      }); // settings/order

    // Spy the controller's Stripe client method
    const paymentsCreate = jest
      .spyOn(Stripe.prototype.paymentIntents, 'create')
      .mockResolvedValue({ id: 'pi_123', client_secret: 'cs_test_123' } as any);

    const res = await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/create-intent`)
      .send({
        cartId: 'cart-1',
        items: [
          { id: '1', qty: 1 },
          { id: '2', qty: 2 },
        ],
        currency: 'ILS',
        customerEmail: 'a@b.com',
      })
      .expect(201);

    expect(res.body).toEqual({
      clientSecret: 'cs_test_123',
      paymentIntentId: 'pi_123',
    });
    expect(paymentsCreate).toHaveBeenCalled();

    // Amount sanity: (50*1 + 30*2 + 10) * 100 = 12000 minor units
    const args = (paymentsCreate.mock.calls[0] ?? [])[0];
    expect(args?.amount).toBe(12000);
    expect(args?.currency).toBe('ils');
  });

  it('POST /payments/webhooks/stripe verifies signature and upserts order (succeeded)', async () => {
    // Prepare a realistic event payload
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
      timestamp: Math.floor(Date.now() / 1000), // number is fine
    });

    // Make runTransaction writable in the mock
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
      .post(`/${apiPrefix}/payments/webhooks/stripe`)
      .set('Stripe-Signature', header)
      .set('Content-Type', 'application/json')
      .send(Buffer.from(payloadRaw)) // raw buffer so raw-body parser keeps signature valid
      .expect(200);
  });

  it('rejects bad webhook signatures', async () => {
    await request(app.getHttpServer())
      .post(`/${apiPrefix}/payments/webhooks/stripe`)
      .set('Stripe-Signature', 'bad')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'))
      .expect(400);
  });
});
