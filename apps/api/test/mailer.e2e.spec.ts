/// <reference types="jest" />
// apps/api/test/mailer.e2e.spec.ts

// Mock nodemailer so no real SMTP is used
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
import nodemailer from 'nodemailer';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MailerModule } from '../src/mailer/mailer.module'; // ✅ correct path

describe('MailerService (unit-ish via DI, no network)', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
  let app: INestApplication;
  let mailer: {
    sendOrderConfirmation: (
      to: string,
      order: {
        orderId: string;
        amount: number;
        currency: string;
        paymentIntentId: string;
        created: boolean;
      },
    ) => Promise<any>;
    sendRefundEmail: (
      to: string,
      refund: {
        orderId: string;
        amount: number;
        currency: string;
        chargeId: string;
        full: boolean;
        refundIds: string[];
      },
    ) => Promise<any>;
  };

  beforeAll(async () => {
    // Make our service get a fake transporter with mocked sendMail
    (nodemailer as any).createTransport.mockReturnValue({ sendMail });

    // Force json transport mode (even if SMTP_URL is set)
    process.env.MAIL_MODE = 'json';
    process.env.MAIL_FROM = 'Bunder Shop <urikhaimov@gmail.com>';

    const modRef = await Test.createTestingModule({
      imports: [MailerModule],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();

    mailer = modRef.get('MAIL_SERVICE');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => sendMail.mockClear());

  it('sends order confirmation with expected fields', async () => {
    await mailer.sendOrderConfirmation('buyer@example.com', {
      orderId: 'order_1',
      amount: 12345, // 123.45
      currency: 'ils',
      paymentIntentId: 'pi_123',
      created: true,
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.from).toContain('Bunder Shop');
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.subject).toMatch(/order_1/i);
    expect(mail.text).toContain('pi_123');
    expect(mail.html).toContain('order_1');
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
