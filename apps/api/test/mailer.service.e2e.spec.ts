/// <reference types="jest" />
// apps/api/test/mailer.service.spec.ts

// Mock nodemailer so no real SMTP is used
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
import nodemailer from 'nodemailer';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MailerService } from '../src/mailer/mailer.service';

describe('MailerService (unit via DI, no network)', () => {
  let app: INestApplication;
  let mailer: MailerService;

  // We'll control the internal sendMail mock returned by createTransport
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });

  const OLD_ENV = { ...process.env };

  beforeAll(async () => {
    // Make our service get a fake transporter with mocked sendMail
    (nodemailer as any).createTransport.mockReturnValue({ sendMail });

    // Force json transport mode (even if SMTP_* is present)
    process.env.MAIL_MODE = 'json';
    process.env.MAIL_FROM = 'shop@example.com';
    process.env.MAIL_FROM_NAME = 'Bunder Shop';

    const modRef = await Test.createTestingModule({
      providers: [MailerService],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();

    mailer = modRef.get(MailerService);
  });

  afterAll(async () => {
    await app.close();
    process.env = OLD_ENV; // restore env
  });

  beforeEach(() => {
    sendMail.mockClear();
    (nodemailer as any).createTransport.mockClear?.();
  });

  it('constructs jsonTransport when MAIL_MODE=json', async () => {
    // Recreate a new instance to assert createTransport args
    (nodemailer as any).createTransport.mockClear();
    const local = new MailerService();
    expect((nodemailer as any).createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ jsonTransport: true }),
    );
    // sanity: instance exists to keep TS happy
    expect(local).toBeInstanceOf(MailerService);
  });

  it('sendOrderConfirmation: basic email (no invoice link, no attachments)', async () => {
    await mailer.sendOrderConfirmation('buyer@example.com', {
      orderId: 'order_1',
      amount: 12345, // cents
      currency: 'ils',
      paymentIntentId: 'pi_123',
      created: true,
      // invoiceUrl omitted
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];

    // "from" should include name + email from env
    expect(mail.from).toBe('Bunder Shop <shop@example.com>');
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.subject).toMatch(/order_1/i);

    // contains core fields in both text & html
    expect(mail.text).toContain('Payment Intent: pi_123');
    expect(mail.html).toContain('Payment Intent');
    // no invoice link when not provided
    expect(mail.text).not.toContain('Invoice: ');
    expect(mail.html).not.toContain('הורדת חשבונית (PDF)');
    expect(mail.attachments).toBeUndefined();
  });

  it('sendOrderConfirmation: includes invoice link and forwards attachment + replyTo', async () => {
    const pdf = Buffer.from('%PDF fake%');
    await mailer.sendOrderConfirmation(
      'buyer@example.com',
      {
        orderId: 'order_2',
        amount: 5000,
        currency: 'ils',
        paymentIntentId: 'pi_456',
        created: false,
        invoiceUrl: 'https://signed.example/invoice.pdf',
      },
      {
        replyTo: 'support@example.com',
        attachments: [
          {
            filename: 'invoice_order_2.pdf',
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      },
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];

    // subject must include order id, but don't assert currency symbol (locale-dependent)
    expect(mail.subject).toMatch(/order_2/i);
    // link in both HTML & text versions
    expect(mail.html).toContain('הורדת חשבונית (PDF)');
    expect(mail.html).toContain('https://signed.example/invoice.pdf');
    expect(mail.text).toContain('Invoice: https://signed.example/invoice.pdf');

    // reply-to + attachment forwarded
    expect(mail.replyTo).toBe('support@example.com');
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments[0]).toEqual(
      expect.objectContaining({
        filename: 'invoice_order_2.pdf',
        content: pdf,
        contentType: 'application/pdf',
      }),
    );
  });

  it('sendRefundEmail: renders refund details and forwards attachments', async () => {
    const doc = Buffer.from('note');
    await mailer.sendRefundEmail(
      'buyer@example.com',
      {
        orderId: 'order_ref',
        amount: 3000,
        currency: 'ils',
        chargeId: 'ch_123',
        full: false,
        refundIds: ['re_1', 're_2'],
      },
      {
        attachments: [{ filename: 'note.txt', content: doc }],
      },
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];

    expect(mail.subject).toMatch(/Partial refund/i);
    expect(mail.text).toContain('Refund IDs: re_1, re_2');
    expect(mail.html).toContain('Refund IDs');
    expect(mail.attachments?.[0]).toEqual(
      expect.objectContaining({ filename: 'note.txt', content: doc }),
    );
  });

  it('safeSend: returns ok=false when transporter throws', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));

    const res = await mailer.sendOrderConfirmation('x@y.z', {
      orderId: 'o-err',
      amount: 100,
      currency: 'usd',
      paymentIntentId: 'pi_err',
      created: true,
    });

    expect(res.ok).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
