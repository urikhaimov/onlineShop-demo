import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bodyParser from 'body-parser';

// ✅ Only wire the controller (keeps boot fast)
import { PaymentsController } from '../src/payments/payments.controller';

// ✅ Use real class tokens but stub methods
import { MailerService } from '../src/mailer/mailer.service';
import { InvoiceService } from '../src/invoice/invoice.service';
import { ConfigService } from '@nestjs/config';

describe('Stripe Webhook — negative signature', () => {
  let app: INestApplication;
  const mailerMock = { sendOrderConfirmation: jest.fn() };
  const invoiceMock = { createInvoicePdf: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        // Provide a fake secret; we won’t compute a valid sig in this test
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'STRIPE_WEBHOOK_SECRET' ? 'whsec_test' : undefined,
          },
        },
        { provide: MailerService, useValue: mailerMock },
        { provide: InvoiceService, useValue: invoiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // ⚠️ Critical for Stripe verification — controller must read raw body
    // Keep the route in sync with your PaymentsController
    app.use('/payments/webhook', bodyParser.raw({ type: '*/*' }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 on invalid signature and triggers no side-effects', async () => {
    const payload = JSON.stringify({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });

    await request(app.getHttpServer())
      .post('/payments/webhook') // ← adjust if your route differs
      .set('stripe-signature', 't=1111111111,v1=deadbeef') // clearly invalid
      .set('content-type', 'application/json')
      .send(payload)
      .expect(400);

    expect(mailerMock.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(invoiceMock.createInvoicePdf).not.toHaveBeenCalled();
  });

  it('returns 400 when signature header is missing', async () => {
    const payload = JSON.stringify({
      id: 'evt_no_sig',
      type: 'charge.succeeded',
    });

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('content-type', 'application/json')
      .send(payload)
      .expect(400);
  });
});
