/// <reference types="jest" />

// Mock @common/firebase like in your webhook spec
jest.mock('@common/firebase', () => {
  const store = new Map<string, any>();
  function makeDoc(key: string) {
    return {
      async get() {
        const val = store.get(key);
        return { exists: val !== undefined, data: () => val };
      },
      async set(data: any) {
        store.set(key, data);
      },
      async update(patch: any) {
        const cur = store.get(key) || {};
        store.set(key, { ...cur, ...patch });
      },
    };
  }
  return {
    _getStore: () => store,
    adminDb: {
      collection: (name: string) => ({
        doc: (id: string) => makeDoc(`${name}/${id}`),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ref.get(),
          set: (r: any, d: any) => r.set(d),
          update: (r: any, p: any) => r.update(p),
        };
        return fn(tx);
      },
    },
  };
});

import * as FirebaseMock from '@common/firebase';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { MailerService } from '../src/mailer/mailer.service'; // ✅ use class token

describe('Resend receipt', () => {
  let app: INestApplication;
  const mailer = { sendOrderConfirmation: jest.fn() } as Pick<
    MailerService,
    'sendOrderConfirmation'
  >;

  beforeAll(async () => {
    // Ensure the path and file name are correct and do not include a file extension
    const { PaymentsModule } = await import('../src/payments/payments.module');

    const mod = await Test.createTestingModule({ imports: [PaymentsModule] })
      // ✅ override the real DI token (the class), not a string
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();

    app = mod.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    await app.init();

    // seed an order with email
    const { adminDb } = FirebaseMock as any;
    await adminDb.collection('orders').doc('order_123').set({
      status: 'paid',
      amount: 5000,
      currency: 'ils',
      paymentIntentId: 'pi_abc',
      email: 'buyer@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
  });
  afterEach(() => jest.clearAllMocks());

  it('resends using stored email', async () => {
    await request(app.getHttpServer())
      .post('/api/payments/orders/order_123/resend-receipt')
      .send({})
      .expect(200)
      .expect({ ok: true });

    expect(mailer.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const [to, payload] = (mailer.sendOrderConfirmation as jest.Mock).mock
      .calls[0];
    expect(to).toBe('buyer@example.com');
    expect(payload.orderId).toBe('order_123');
    expect(payload.paymentIntentId).toBe('pi_abc');
    expect(payload.created).toBe(false);
  });

  it('resends to an override email when provided', async () => {
    await request(app.getHttpServer())
      .post('/api/payments/orders/order_123/resend-receipt')
      .send({ email: 'alt@example.com' })
      .expect(200);

    const [to] = (mailer.sendOrderConfirmation as jest.Mock).mock.calls[0];
    expect(to).toBe('alt@example.com');
  });
});
