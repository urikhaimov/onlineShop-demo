// src/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

type OrderEmailPayload = {
  orderId: string;
  amount: number; // minor units
  currency: string | null; // e.g., "ils"
  paymentIntentId: string;
  created: boolean;
  invoiceUrl?: string | null; // ✅ added for PDF link in email body
};

type RefundEmailPayload = {
  orderId: string;
  amount: number;
  currency: string | null;
  chargeId: string;
  full: boolean;
  refundIds: string[];
};

type MailerOptions = {
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    const {
      SMTP_URL,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_SECURE,
      MAIL_FROM,
      MAIL_FROM_NAME,
      MAIL_MODE,
      NODE_ENV,
    } = process.env;

    const baseOpts: any = {
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    };

    if (MAIL_MODE === 'json' || NODE_ENV === 'test') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else if (SMTP_URL) {
      // URL-based config (works with SendGrid, etc.)
      this.transporter = nodemailer.createTransport({
        ...baseOpts,
        url: SMTP_URL,
      });
    } else if (SMTP_HOST) {
      // Host/port config
      this.transporter = nodemailer.createTransport({
        ...baseOpts,
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: String(SMTP_SECURE ?? '').toLowerCase() === 'true',
        auth: SMTP_USER
          ? { user: SMTP_USER, pass: SMTP_PASS ?? '' }
          : undefined,
      });
    } else {
      // Fallback for local/dev
      this.logger.warn(
        'No SMTP configured. Falling back to jsonTransport (logs only).',
      );
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }

    const from = MAIL_FROM || 'no-reply@example.com';
    const name = MAIL_FROM_NAME || 'Shop';
    this.fromAddress = name ? `${name} <${from}>` : from;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Order confirmation
  // ────────────────────────────────────────────────────────────────────────────
  async sendOrderConfirmation(
    to: string,
    payload: OrderEmailPayload,
    opts?: MailerOptions,
  ) {
    const { orderId, amount, currency, paymentIntentId, created, invoiceUrl } =
      payload;
    const fmt = this.formatMoney(amount, currency);
    const subject = created
      ? `Order ${orderId} confirmed — ${fmt}`
      : `Payment received for ${orderId} — ${fmt}`;

    const invoiceLinkHtml = invoiceUrl
      ? `<p style="margin:12px 0"><a href="${this.escape(invoiceUrl)}" target="_blank" rel="noopener">הורדת חשבונית (PDF)</a></p>`
      : '';

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">תודה על ההזמנה!</h2>
        <p style="margin:0 0 12px">ההזמנה <strong>${this.escape(orderId)}</strong> התקבלה בהצלחה.</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li>סכום: <strong>${fmt}</strong></li>
          <li>מטבע: <strong>${(currency || 'ILS').toUpperCase()}</strong></li>
          <li>Payment Intent: <code>${this.escape(paymentIntentId)}</code></li>
        </ul>
        ${invoiceLinkHtml}
        <p style="margin:16px 0 0">אם יש לך שאלות, פשוט השב/י למייל זה.</p>
      </div>
    `;

    const text = [
      'תודה על ההזמנה!',
      `הזמנה: ${orderId}`,
      `סכום: ${fmt}`,
      `מטבע: ${(currency || 'ILS').toUpperCase()}`,
      `Payment Intent: ${paymentIntentId}`,
      invoiceUrl ? `Invoice: ${invoiceUrl}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    return this.safeSend({
      to,
      subject,
      html,
      text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Refund email (full or partial)
  // ────────────────────────────────────────────────────────────────────────────
  async sendRefundEmail(
    to: string,
    payload: RefundEmailPayload,
    opts?: MailerOptions,
  ) {
    const { orderId, amount, currency, chargeId, full, refundIds } = payload;
    const fmt = this.formatMoney(amount, currency);
    const subject = full
      ? `Refund issued for ${orderId} — ${fmt}`
      : `Partial refund for ${orderId} — ${fmt}`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">${full ? 'החזר הושלם' : 'החזר חלקי'}</h2>
        <p style="margin:0 0 12px">עבור ההזמנה <strong>${this.escape(orderId)}</strong>.</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li>סכום ההחזר: <strong>${fmt}</strong></li>
          <li>Charge ID: <code>${this.escape(chargeId)}</code></li>
          <li>Refund IDs: <code>${(refundIds || []).map(this.escape).join(', ') || '-'}</code></li>
        </ul>
        <p style="margin:16px 0 0">נשמח לסייע בכל שאלה.</p>
      </div>
    `;
    const text =
      `${full ? 'החזר הושלם' : 'החזר חלקי'} להזמנה ${orderId}\n` +
      `סכום: ${fmt}\n` +
      `Charge: ${chargeId}\n` +
      `Refund IDs: ${(refundIds || []).join(', ') || '-'}`;

    return this.safeSend({
      to,
      subject,
      html,
      text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────
  private async safeSend(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>;
  }): Promise<{ ok: boolean; id?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        replyTo: opts.replyTo,
        attachments: opts.attachments,
        // headers: { 'List-Unsubscribe': '<mailto:unsubscribe@bundershop.is-a.dev>' },
      });
      this.logger.log(`Email sent to ${opts.to}: ${info.messageId ?? ''}`);
      return { ok: true, id: info.messageId as string | undefined };
    } catch (e) {
      this.logger.error(`Email send failed: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  private formatMoney(amountMinor: number, currency: string | null) {
    const curr = (currency || 'ILS').toUpperCase();
    const major = (amountMinor ?? 0) / 100;
    try {
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: curr,
      }).format(major);
    } catch {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: curr,
      }).format(major);
    }
  }

  private escape(s: string) {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(s).replace(/[&<>"']/g, (m) => map[m]);
  }
}
