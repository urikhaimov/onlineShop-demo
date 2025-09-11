import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

type OrderEmailPayload = {
  orderId: string;
  amount: number; // in minor units (e.g., 12000 agorot)
  currency: string | null; // e.g., "ils"
  paymentIntentId: string;
  created: boolean;
};

type RefundEmailPayload = {
  orderId: string;
  amount: number; // in minor units
  currency: string | null; // e.g., "ils"
  chargeId: string;
  full: boolean;
  refundIds: string[];
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    // 1) Build transporter from env (SMTP_URL or host/port/user/pass)
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

    if (MAIL_MODE === 'json' || NODE_ENV === 'test') {
      // log-only “transport” (no real sends) — great for dev
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else if (SMTP_URL) {
      this.transporter = nodemailer.createTransport(SMTP_URL);
    } else if (SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: String(SMTP_SECURE ?? '').toLowerCase() === 'true', // true for 465, false for 587
        auth: SMTP_USER
          ? { user: SMTP_USER, pass: SMTP_PASS ?? '' }
          : undefined,
      });
    } else {
      // Fallback to jsonTransport if nothing configured
      this.logger.warn(
        'No SMTP configured. Falling back to jsonTransport (logs only).',
      );
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }

    const from = MAIL_FROM || 'no-reply@example.com';
    const name = MAIL_FROM_NAME || 'Shop';
    this.fromAddress = name ? `${name} <${from}>` : from;
  }

  // --------------------------------------------------------------------------
  // Called by PaymentsController on payment_intent.succeeded
  // --------------------------------------------------------------------------
  async sendOrderConfirmation(to: string, payload: OrderEmailPayload) {
    const { orderId, amount, currency, paymentIntentId, created } = payload;
    const fmt = this.formatMoney(amount, currency);
    const subject = created
      ? `Order ${orderId} confirmed — ${fmt}`
      : `Payment received for ${orderId} — ${fmt}`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">תודה על ההזמנה!</h2>
        <p style="margin:0 0 12px">ההזמנה <strong>${this.escape(orderId)}</strong> התקבלה בהצלחה.</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li>סכום: <strong>${fmt}</strong></li>
          <li>מטבע: <strong>${(currency || 'ILS').toUpperCase()}</strong></li>
          <li>Payment Intent: <code>${this.escape(paymentIntentId)}</code></li>
        </ul>
        <p style="margin:16px 0 0">אם יש לך שאלות, נשמח לעזור — פשוט השב/י למייל זה.</p>
      </div>
    `;

    const text =
      'תודה על ההזמנה!\n' +
      `הזמנה: ${orderId}\n` +
      `סכום: ${fmt}\n` +
      `מטבע: ${(currency || 'ILS').toUpperCase()}\n` +
      `Payment Intent: ${paymentIntentId}\n`;

    await this.safeSend({
      to,
      subject,
      html,
      text,
    });
  }

  // --------------------------------------------------------------------------
  // Called by PaymentsController on charge.refunded (full/partial)
  // --------------------------------------------------------------------------
  async sendRefundEmail(to: string, payload: RefundEmailPayload) {
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
          <li>Refund IDs: <code>${refundIds.map(this.escape).join(', ') || '-'}</code></li>
        </ul>
        <p style="margin:16px 0 0">נשמח לסייע בכל שאלה.</p>
      </div>
    `;

    const text =
      `${full ? 'החזר הושלם' : 'החזר חלקי'} להזמנה ${orderId}\n` +
      `סכום: ${fmt}\n` +
      `Charge: ${chargeId}\n` +
      `Refund IDs: ${refundIds.join(', ') || '-'}\n`;

    await this.safeSend({
      to,
      subject,
      html,
      text,
    });
  }

  // --------------------------------------------------------------------------
  // helpers
  // --------------------------------------------------------------------------
  private async safeSend(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.logger.log(`Email sent to ${opts.to}: ${info.messageId ?? ''}`);
    } catch (e) {
      this.logger.error(`Email send failed: ${(e as Error).message}`);
    }
  }

  private formatMoney(amountMinor: number, currency: string | null) {
    const curr = (currency || 'ILS').toUpperCase();
    const major = (amountMinor ?? 0) / 100;
    // he-IL displays ₪ nicely; fallback to en if needed
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
    return String(s).replace(
      /[&<>"']/g,
      (m) =>
        (
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          }) as any
        )[m],
    );
  }
}
