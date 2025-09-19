// src/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import sgMail, { MailDataRequired } from '@sendgrid/mail';

type OrderEmailPayload = {
  orderId: string;
  amount: number; // minor units
  currency: string | null; // e.g., "ils"
  paymentIntentId: string;
  created: boolean;
  invoiceUrl?: string | null; // PDF link in email body
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

type Provider = 'sendgrid' | 'smtp' | 'json';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter; // for SMTP / JSON
  private readonly provider: Provider;
  private readonly fromAddress: string;
  private readonly sandbox: boolean;

  constructor() {
    const {
      // selection
      EMAIL_PROVIDER, // 'sendgrid' | 'smtp' | 'json'
      NODE_ENV,

      // sendgrid
      SENDGRID_API_KEY,
      SENDGRID_SANDBOX, // 'true' | 'false'

      // smtp (or URL)
      SMTP_URL,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_SECURE,

      // generic
      MAIL_FROM,
      MAIL_FROM_NAME,
      MAIL_MODE, // legacy: 'json' in tests/local
    } = process.env;

    // Determine provider
    let provider: Provider =
      (EMAIL_PROVIDER as Provider) ||
      (MAIL_MODE === 'json' || NODE_ENV === 'test' ? 'json' : 'smtp');

    // If provider is sendgrid but no key, fall back safely to json
    if (provider === 'sendgrid' && !SENDGRID_API_KEY) {
      this.logger.warn(
        'EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY is missing. Falling back to JSON (no delivery).',
      );
      provider = 'json';
    }

    this.provider = provider;
    this.sandbox = String(SENDGRID_SANDBOX ?? '').toLowerCase() === 'true';

    const from = MAIL_FROM || 'no-reply@example.com';
    const name = MAIL_FROM_NAME || 'Shop';
    this.fromAddress = name ? `${name} <${from}>` : from;

    // Init concrete transport
    if (this.provider === 'sendgrid') {
      sgMail.setApiKey(SENDGRID_API_KEY!);
      if (this.sandbox) {
        this.logger.warn(
          'SendGrid sandbox mode ENABLED — emails will NOT be delivered.',
        );
      }
      this.logger.log('Mailer initialized: provider=sendgrid');
    } else if (this.provider === 'smtp') {
      const baseOpts: any = {
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      };

      if (SMTP_URL) {
        this.transporter = nodemailer.createTransport({
          ...baseOpts,
          url: SMTP_URL,
        });
      } else if (SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          ...baseOpts,
          host: SMTP_HOST,
          port: Number(SMTP_PORT ?? 587),
          secure:
            String(SMTP_SECURE ?? '').toLowerCase() === 'true' ||
            Number(SMTP_PORT) === 465,
          auth: SMTP_USER
            ? { user: SMTP_USER, pass: SMTP_PASS ?? '' }
            : undefined,
        });
      } else {
        // convenience: allow sendgrid over SMTP if user forgot provider
        if (SENDGRID_API_KEY) {
          this.logger.warn(
            'No SMTP_* provided; attempting SendGrid SMTP fallback.',
          );
          this.transporter = nodemailer.createTransport({
            ...baseOpts,
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: { user: 'apikey', pass: SENDGRID_API_KEY },
          });
        } else {
          this.logger.warn(
            'No SMTP configured. Falling back to jsonTransport (logs only).',
          );
          this.transporter = nodemailer.createTransport({
            jsonTransport: true,
          });
          this.provider = 'json';
        }
      }

      // Try verifying SMTP at boot (best-effort)
      this.transporter?.verify().then(
        () => this.logger.log('SMTP transporter verified successfully'),
        (err) => this.logger.warn(`SMTP verify failed: ${err?.message || err}`),
      );

      this.logger.log(
        `Mailer initialized: provider=${this.provider}${SMTP_URL ? ' (url)' : ''}`,
      );
    } else {
      // JSON/log-only
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.log('Mailer initialized: provider=json (no real delivery)');
    }
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
  // Core sender (provider-aware)
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
      if (this.provider === 'sendgrid') {
        const msg: MailDataRequired = {
          from: this.fromAddress,
          to: opts.to,
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
          replyTo: opts.replyTo,
          attachments: (opts.attachments || []).map((a) => ({
            filename: a.filename,
            type: a.contentType || 'application/octet-stream',
            content: a.content.toString('base64'),
            disposition: 'attachment',
          })),
          mailSettings: this.sandbox
            ? { sandboxMode: { enable: true } }
            : undefined,
          // trackingSettings: { clickTracking: { enable: false, enableText: false } },
          // headers: { 'List-Unsubscribe': '<mailto:unsubscribe@yourdomain>' },
        };

        const [resp] = await sgMail.send(msg);
        const msgId =
          (resp.headers && (resp.headers['x-message-id'] as string)) ||
          (resp.headers &&
            (resp.headers['x-message-id'.toLowerCase()] as string)) ||
          undefined;

        this.logger.log(
          `Email sent (provider=sendgrid) to ${opts.to}: status=${resp.statusCode}${
            msgId ? ` id=${msgId}` : ''
          }`,
        );
        return { ok: true, id: msgId };
      }

      // SMTP / JSON via Nodemailer
      const info = await this.transporter!.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        replyTo: opts.replyTo,
        attachments: opts.attachments,
        // headers: { 'List-Unsubscribe': '<mailto:unsubscribe@yourdomain>' },
      });
      this.logger.log(
        `Email sent (provider=${this.provider}) to ${opts.to}: ${info.messageId ?? ''}`,
      );
      return { ok: true, id: info.messageId as string | undefined };
    } catch (e) {
      this.logger.error(`Email send failed: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Utils
  // ────────────────────────────────────────────────────────────────────────────
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
