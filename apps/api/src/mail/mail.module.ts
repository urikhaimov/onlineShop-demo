// apps/api/src/mail/mail.module.ts (example)
import { Module } from '@nestjs/common';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
  throw new Error('Missing required SMTP environment variables');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

@Module({
  providers: [
    {
      provide: 'MAIL_SERVICE',
      useValue: {
        async sendOrderConfirmation(to: string, payload: any) {
          await transporter.sendMail({
            to,
            from: process.env.MAIL_FROM!,
            subject: `Order ${payload.orderId} confirmed`,
            html: `<p>Thanks! Order <b>${payload.orderId}</b> paid ${payload.amount / 100} ${payload.currency?.toUpperCase() || ''}.</p>`,
          });
        },
        async sendRefundEmail(to: string, payload: any) {
          await transporter.sendMail({
            to,
            from: process.env.MAIL_FROM!,
            subject: `Refund for order ${payload.orderId}`,
            html: `<p>Refunded ${payload.amount / 100} ${payload.currency?.toUpperCase() || ''} (${payload.full ? 'full' : 'partial'}).</p>`,
          });
        },
      },
    },
  ],
  exports: ['MAIL_SERVICE'],
})
export class MailModule {}
