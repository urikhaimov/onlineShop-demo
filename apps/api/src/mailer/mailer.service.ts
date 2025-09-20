// src/mailer/mailer.service.ts

import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import sgMail, { MailDataRequired } from '@sendgrid/mail';

/** ───────────────────────── Types ───────────────────────── */
type OrderEmailPayload = {
  orderId: string;
  amount: number; // minor units
  currency: string | null; // e.g., "ils"
  paymentIntentId: string;
  created: boolean;
  invoiceUrl?: string | null; // PDF link in email body
  locale?: 'he' | 'en';
};

type RefundEmailPayload = {
  orderId: string;
  amount: number;
  currency: string | null;
  chargeId: string;
  full: boolean;
  refundIds: string[];
  locale?: 'he' | 'en';
};

type OrderUpdatePayload = {
  orderId: string;
  status?: string; // shipped | delivered | paid | canceled | refunded | open | ...
  delivery?: {
    provider?: string;
    trackingNumber?: string;
    eta?: string | null;
  };
  locale?: 'he' | 'en';
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

/** ───────────────────────── i18n helpers ─────────────────────────
 * Loads server dictionaries from src/i18n/{en,he}/common.json
 * Fallbacks: payload.locale → MAIL_LOCALE → 'he', then to 'en'.
 */
type Dict = Record<string, any>;
function safeGet(obj: any, path: string): string | undefined {
  return String(path)
    .split('.')
    .reduce<any>(
      (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined),
      obj,
    );
}
function template(str: string, vars?: Record<string, any>): string {
  if (!str) return '';
  return str.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k.trim()];
    return v === undefined || v === null ? '' : String(v);
  });
}

// Use require to avoid TS config constraints if resolveJsonModule isn't set.
let EN: Dict = {};
let HE: Dict = {};
try {
  EN = require('../i18n/en/common.json');
} catch {}
try {
  HE = require('../i18n/he/common.json');
} catch {}

function getDict(locale?: string): Dict {
  const l = (locale || process.env.MAIL_LOCALE || 'he').toLowerCase();
  if (l.startsWith('he')) return Object.keys(HE).length ? HE : EN;
  return Object.keys(EN).length ? EN : HE;
}

function t(
  locale: string | undefined,
  key: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  const dict = getDict(locale);
  const val = safeGet(dict, key) as string | undefined;
  if (typeof val === 'string') return template(val, vars);
  // English fallback if the chosen dict lacks the key
  const en = safeGet(EN, key) as string | undefined;
  if (typeof en === 'string') return template(en, vars);
  return template(fallback ?? '', vars);
}

/** ───────────────────────── Service ───────────────────────── */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter; // for SMTP / JSON
  private provider: Provider;
  private readonly fromAddress: string;
  private readonly sandbox: boolean;

  constructor() {
    const {
      EMAIL_PROVIDER,
      NODE_ENV,
      SENDGRID_API_KEY,
      SENDGRID_SANDBOX,
      SMTP_URL,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_SECURE,
      MAIL_FROM,
      MAIL_FROM_NAME,
      MAIL_MODE,
    } = process.env;

    let provider: Provider =
      (EMAIL_PROVIDER as Provider) ||
      (MAIL_MODE === 'json' || NODE_ENV === 'test' ? 'json' : 'smtp');

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

    if (this.provider === 'sendgrid') {
      sgMail.setApiKey(SENDGRID_API_KEY!);
      if (this.sandbox)
        this.logger.warn(
          'SendGrid sandbox mode ENABLED — emails will NOT be delivered.',
        );
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
        if (process.env.SENDGRID_API_KEY) {
          this.logger.warn(
            'No SMTP_* provided; attempting SendGrid SMTP fallback.',
          );
          this.transporter = nodemailer.createTransport({
            ...baseOpts,
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
          });
          this.provider = 'smtp';
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
      this.transporter?.verify().then(
        () => this.logger.log('SMTP transporter verified successfully'),
        (err) => this.logger.warn(`SMTP verify failed: ${err?.message || err}`),
      );
      this.logger.log(
        `Mailer initialized: provider=${this.provider}${SMTP_URL ? ' (url)' : ''}`,
      );
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.log('Mailer initialized: provider=json (no real delivery)');
    }
  }

  /** ───────────────── Order confirmation ───────────────── */
  async sendOrderConfirmation(
    to: string,
    payload: OrderEmailPayload,
    opts?: MailerOptions,
  ) {
    const {
      orderId,
      amount,
      currency,
      paymentIntentId,
      created,
      invoiceUrl,
      locale,
    } = payload;
    const fmt = this.formatMoney(amount, currency);

    const subject = created
      ? t(
          locale,
          'email.order.subject.created',
          { id: orderId, amount: fmt },
          `Order ${orderId} confirmed — ${fmt}`,
        )
      : t(
          locale,
          'email.order.subject.paid',
          { id: orderId, amount: fmt },
          `Payment received for ${orderId} — ${fmt}`,
        );

    const heading = t(
      locale,
      'email.order.heading',
      {},
      'Thank you for your order!',
    );
    const received = t(
      locale,
      'email.order.received',
      { id: orderId },
      `Order ${orderId} was received successfully.`,
    );
    const fAmount = t(locale, 'email.order.fields.amount', {}, 'Amount');
    const fCurrency = t(locale, 'email.order.fields.currency', {}, 'Currency');
    const fPi = t(locale, 'email.order.fields.pi', {}, 'Payment Intent');
    const invoiceLabel = t(
      locale,
      'email.order.invoice_link',
      {},
      'Download invoice (PDF)',
    );
    const questions = t(
      locale,
      'email.order.questions',
      {},
      'If you have any questions, just reply to this email.',
    );

    const invoiceLinkHtml = invoiceUrl
      ? `<p style="margin:12px 0"><a href="${this.escape(invoiceUrl)}" target="_blank" rel="noopener">${this.escape(invoiceLabel)}</a></p>`
      : '';

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">${this.escape(heading)}</h2>
        <p style="margin:0 0 12px">${this.escape(received)}</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li>${this.escape(fAmount)}: <strong>${fmt}</strong></li>
          <li>${this.escape(fCurrency)}: <strong>${(currency || 'ILS').toUpperCase()}</strong></li>
          <li>${this.escape(fPi)}: <code>${this.escape(paymentIntentId)}</code></li>
        </ul>
        ${invoiceLinkHtml}
        <p style="margin:16px 0 0">${this.escape(questions)}</p>
      </div>
    `;

    const text = [
      heading,
      template(received, { id: orderId }),
      `${fAmount}: ${fmt}`,
      `${fCurrency}: ${(currency || 'ILS').toUpperCase()}`,
      `${fPi}: ${paymentIntentId}`,
      invoiceUrl ? `${invoiceLabel}: ${invoiceUrl}` : undefined,
      questions,
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

  /** ───────────────── Order update (by status) ───────────────── */
  async sendOrderUpdate(
    to: string,
    payload: OrderUpdatePayload,
    opts?: MailerOptions,
  ) {
    const { orderId, status, delivery, locale } = payload;

    const statusKey = (status || 'open').toLowerCase();
    const subject =
      t(locale, `email.update.subject.${statusKey}`, { id: orderId }, '') ||
      t(
        locale,
        'email.update.subject.updated',
        { id: orderId },
        `Order ${orderId} updated`,
      );

    const heading = t(
      locale,
      'email.update.heading',
      {},
      'Your order was updated.',
    );
    const fStatus = t(locale, 'email.update.fields.status', {}, 'Status');
    const fProvider = t(locale, 'email.update.fields.provider', {}, 'Provider');
    const fTracking = t(locale, 'email.update.fields.tracking', {}, 'Tracking');
    const fEta = t(locale, 'email.update.fields.eta', {}, 'ETA');

    const statusLabel =
      t(locale, `status.${statusKey}`, {}, status || '') ||
      (status ? status : '');

    const lines: string[] = [];
    if (statusLabel)
      lines.push(
        `<li>${this.escape(fStatus)}: <strong>${this.escape(statusLabel)}</strong></li>`,
      );
    if (delivery?.provider)
      lines.push(
        `<li>${this.escape(fProvider)}: <strong>${this.escape(delivery.provider)}</strong></li>`,
      );
    if (delivery?.trackingNumber)
      lines.push(
        `<li>${this.escape(fTracking)}: <code>${this.escape(delivery.trackingNumber)}</code></li>`,
      );
    if (delivery?.eta)
      lines.push(
        `<li>${this.escape(fEta)}: <strong>${this.escape(delivery.eta)}</strong></li>`,
      );

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">${this.escape(heading)}</h2>
        <p style="margin:0 0 12px">${this.escape(
          t(
            locale,
            'email.update.body',
            { id: orderId },
            `Your order ${orderId} was updated.`,
          ),
        )}</p>
        ${lines.length ? `<ul style="margin:0 0 12px;padding-left:18px">${lines.join('')}</ul>` : ''}
      </div>
    `;

    const textLines: string[] = [];
    if (statusLabel) textLines.push(`${fStatus}: ${statusLabel}`);
    if (delivery?.provider)
      textLines.push(`${fProvider}: ${delivery.provider}`);
    if (delivery?.trackingNumber)
      textLines.push(`${fTracking}: ${delivery.trackingNumber}`);
    if (delivery?.eta) textLines.push(`${fEta}: ${delivery.eta}`);

    const text = [
      t(
        locale,
        'email.update.body',
        { id: orderId },
        `Your order ${orderId} was updated.`,
      ),
      ...textLines,
    ].join('\n');

    return this.safeSend({
      to,
      subject,
      html,
      text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
  }

  /** ───────────────── Refund (full or partial) ───────────────── */
  async sendRefundEmail(
    to: string,
    payload: RefundEmailPayload,
    opts?: MailerOptions,
  ) {
    const { orderId, amount, currency, chargeId, full, refundIds, locale } =
      payload;
    const fmt = this.formatMoney(amount, currency);

    const subject = full
      ? t(
          locale,
          'email.refund.subject.full',
          { id: orderId, amount: fmt },
          `Refund issued for ${orderId} — ${fmt}`,
        )
      : t(
          locale,
          'email.refund.subject.partial',
          { id: orderId, amount: fmt },
          `Partial refund for ${orderId} — ${fmt}`,
        );

    const heading = full
      ? t(locale, 'email.refund.heading.full', {}, 'Refund completed')
      : t(locale, 'email.refund.heading.partial', {}, 'Partial refund');

    const fAmount = t(locale, 'email.order.fields.amount', {}, 'Amount');
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
        <h2 style="margin:0 0 12px">${this.escape(heading)}</h2>
        <p style="margin:0 0 12px">${this.escape(
          t(
            locale,
            'email.refund.body',
            { id: orderId },
            `For order ${orderId}.`,
          ),
        )}</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li>${this.escape(fAmount)}: <strong>${fmt}</strong></li>
          <li>Charge ID: <code>${this.escape(chargeId)}</code></li>
          <li>Refund IDs: <code>${(refundIds || []).map(this.escape).join(', ') || '-'}</code></li>
        </ul>
      </div>
    `;

    const text =
      `${heading}\n` +
      `${t(locale, 'email.refund.body', { id: orderId }, `For order ${orderId}.`)}\n` +
      `${fAmount}: ${fmt}\n` +
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

  /** ───────────────── Core sender (provider-aware) ───────────────── */
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
        };
        const [resp] = await sgMail.send(msg);
        const msgId =
          (resp.headers && (resp.headers['x-message-id'] as string)) ||
          (resp.headers &&
            (resp.headers['x-message-id'.toLowerCase()] as string)) ||
          undefined;
        this.logger.log(
          `Email sent (provider=sendgrid) to ${opts.to}: status=${resp.statusCode}${msgId ? ` id=${msgId}` : ''}`,
        );
        return { ok: true, id: msgId };
      }

      const info = await this.transporter!.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        replyTo: opts.replyTo,
        attachments: opts.attachments,
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

  /** ───────────────── Utils ───────────────── */
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
