/// <reference types="jest" />
// apps/api/test/mailer.e2e.spec.ts

// Mock nodemailer so no real SMTP is used
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
import nodemailer from 'nodemailer';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MailerModule } from '../src/mailer/mailer.module';
import { MailerService } from '../src/mailer/mailer.service'; // ✅ use class token

describe('MailerService (unit-ish via DI, no network)', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
  let app: INestApplication;
  let mailer: MailerService;
  const OLD_ENV = { ...process.env };

  beforeAll(async () => {
    // Make our service get a fake transporter with mocked sendMail
    (nodemailer as any).createTransport.mockReturnValue({ sendMail });

    // Force json transport mode (even if SMTP_URL is set)
    process.env.MAIL_MODE = 'json';
    // ✅ Avoid nested names: set plain email + explicit name
    process.env.MAIL_FROM = 'urikhaimov@gmail.com';
    process.env.MAIL_FROM_NAME = 'Bunder Shop';

    const modRef = await Test.createTestingModule({
      imports: [MailerModule],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();

    // ✅ get via class token for consistency
    mailer = modRef.get(MailerService);
  });

  afterAll(async () => {
    await app.close();
    // restore env
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    sendMail.mockClear();
    (nodemailer as any).createTransport.mockClear?.();
  });

  it('sends order confirmation with expected fields', async () => {
    await mailer.sendOrderConfirmation('buyer@example.com', {
      orderId: 'order_1',
      amount: 12345, // cents
      currency: 'ils',
      paymentIntentId: 'pi_123',
      created: true,
    });

    // (intentionally not asserting createTransport call count — implementation may reuse a cached transporter)

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];

    expect(mail.from).toBe('Bunder Shop <urikhaimov@gmail.com>'); // exact match
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.subject).toMatch(/order_1/i);
    expect(mail.text).toContain('pi_123');
    expect(mail.html).toContain('order_1');
    // (optional) if your service uppercases currency:
    // expect(mail.text).toMatch(/\bILS\b/);
  });

  it('sends refund email with refund IDs listed', async () => {
    await mailer.sendRefundEmail('buyer@example.com', {
      orderId: 'order_2',
      amount: 5000,
      currency: 'ils',
      chargeId: 'ch_123',
      full: false,
      refundIds: ['re_1'],
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];

    expect(mail.subject).toMatch(/order_2/i);
    expect(mail.text).toContain('re_1');
    expect(mail.html).toContain('re_1');
  });
});
