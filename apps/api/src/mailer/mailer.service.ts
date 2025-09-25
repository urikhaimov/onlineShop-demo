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
  status?: string; // open | authorized | paid | shipped | delivered | refunded | canceled
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

/** ───────────────────────── i18n helpers ───────────────────────── */
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
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
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

      if (this.transporter) {
        this.transporter.verify().then(
          () => this.logger.log('SMTP transporter verified successfully'),
          (err) =>
            this.logger.warn(`SMTP verify failed: ${err?.message || err}`),
        );
      }

      this.logger.log(
        `Mailer initialized: provider=${this.provider}${SMTP_URL ? ' (url)' : ''}`,
      );
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.log('Mailer initialized: provider=json (no real delivery)');
    }
  }

  /** ───────────────── Order confirmation / receipt via MJML templates ───────────────── */
  async sendOrderConfirmation(
    to: string,
    payload: OrderEmailPayload,
    opts?: MailerOptions,
  ) {
    const { created, locale } = payload;

    const tplName = created ? 'order-confirmed' : 'payment-receipt';
    const fallbackSubject = created
      ? t(
          locale,
          'email.order.subject.created',
          {
            id: payload.orderId,
            amount: this.formatMoney(payload.amount, payload.currency),
          },
          `Order ${payload.orderId} confirmed — ${this.formatMoney(payload.amount, payload.currency)}`,
        )
      : t(
          locale,
          'email.order.subject.paid',
          {
            id: payload.orderId,
            amount: this.formatMoney(payload.amount, payload.currency),
          },
          `Payment received for ${payload.orderId} — ${this.formatMoney(payload.amount, payload.currency)}`,
        );

    const rendered = await this.renderWithTemplates(
      tplName,
      locale,
      this.payloadToVars(payload),
      fallbackSubject,
    );

    if (!rendered.ok) {
      const { orderId, amount, currency, paymentIntentId, invoiceUrl } =
        payload;
      const fmt = this.formatMoney(amount, currency);
      const subject = fallbackSubject;

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
      const fCurrency = t(
        locale,
        'email.order.fields.currency',
        {},
        'Currency',
      );
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
        ? `<p style="margin:12px 0"><a href="${this.escape(
            invoiceUrl,
          )}" target="_blank" rel="noopener">${this.escape(
            invoiceLabel,
          )}</a></p>`
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

    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
  }

  /** ───────────────── Order update (status-specific templates) ───────────────── */
  async sendOrderUpdate(
    to: string,
    payload: OrderUpdatePayload,
    opts?: MailerOptions,
  ) {
    const { orderId, status, delivery, locale } = payload;
    const statusKey = String(status || 'open').toLowerCase();

    const fallbackSubject =
      t(locale, `email.update.subject.${statusKey}`, { id: orderId }, '') ||
      t(
        locale,
        'email.update.subject.updated',
        { id: orderId },
        `Order ${orderId} updated`,
      );

    // Try status-specific files: order_shipped / order_delivered / order_canceled, etc.
    const tplCandidates = [
      `order_${statusKey}`, // underscore style we added
      'order-update', // optional generic template if present
    ];

    const baseVars = {
      orderId,
      status: statusKey,
      statusLabel:
        t(locale, `status.${statusKey}`, {}, status || '') || (status ?? ''),
      deliveryProvider: delivery?.provider ?? '',
      deliveryTracking: delivery?.trackingNumber ?? '',
      deliveryEta: delivery?.eta ?? '',
      brandName: process.env.MAIL_BRAND_NAME || 'Shop',
      brandUrl: process.env.PUBLIC_BASE_URL || '',
      assetsBaseUrl: process.env.MAIL_ASSETS_URL || '',
    };

    let rendered:
      | { ok: true; subject: string; html: string; text: string }
      | { ok: false }
      | undefined;

    for (const name of tplCandidates) {
      rendered = await this.renderWithTemplates(
        name,
        locale,
        baseVars,
        fallbackSubject,
      );
      if (rendered.ok) break;
    }

    if (!rendered || !rendered.ok) {
      // Fallback to plaintext/HTML
      const heading = t(
        locale,
        'email.update.heading',
        {},
        'Your order was updated.',
      );
      const fStatus = t(locale, 'email.update.fields.status', {}, 'Status');
      const fProvider = t(
        locale,
        'email.update.fields.provider',
        {},
        'Provider',
      );
      const fTracking = t(
        locale,
        'email.update.fields.tracking',
        {},
        'Tracking',
      );
      const fEta = t(locale, 'email.update.fields.eta', {}, 'ETA');

      const lines: string[] = [];
      if (baseVars.statusLabel)
        lines.push(
          `<li>${this.escape(fStatus)}: <strong>${this.escape(baseVars.statusLabel)}</strong></li>`,
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
          <p style="margin:0 0 12px">${this.escape(t(locale, 'email.update.body', { id: orderId }, `Your order ${orderId} was updated.`))}</p>
          ${lines.length ? `<ul style="margin:0 0 12px;padding-left:18px">${lines.join('')}</ul>` : ''}
        </div>
      `;

      const textLines: string[] = [];
      if (baseVars.statusLabel)
        textLines.push(`${fStatus}: ${baseVars.statusLabel}`);
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
        subject: fallbackSubject,
        html,
        text,
        replyTo: opts?.replyTo,
        attachments: opts?.attachments,
      });
    }

    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
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

    const fallbackSubject = full
      ? t(
          locale,
          'email.refund.subject.full',
          { id: orderId, amount: this.formatMoney(amount, currency) },
          `Refund issued for ${orderId} — ${this.formatMoney(amount, currency)}`,
        )
      : t(
          locale,
          'email.refund.subject.partial',
          { id: orderId, amount: this.formatMoney(amount, currency) },
          `Partial refund for ${orderId} — ${this.formatMoney(amount, currency)}`,
        );

    const rendered = await this.renderWithTemplates(
      'refund',
      locale,
      {
        orderId,
        isFull: !!full,
        amountMinor: amount,
        amount: this.formatMoney(amount, currency),
        currency: (currency || 'ILS').toUpperCase(),
        chargeId,
        refundIds,
      },
      fallbackSubject,
    );

    if (!rendered.ok) {
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
            <li>${this.escape(fAmount)}: <strong>${this.formatMoney(amount, currency)}</strong></li>
            <li>Charge ID: <code>${this.escape(chargeId)}</code></li>
            <li>Refund IDs: <code>${(refundIds || []).map(this.escape).join(', ') || '-'}</code></li>
          </ul>
        </div>
      `;
      const text =
        `${heading}\n` +
        `${t(locale, 'email.refund.body', { id: orderId }, `For order ${orderId}.`)}\n` +
        `${fAmount}: ${this.formatMoney(amount, currency)}\n` +
        `Charge: ${chargeId}\n` +
        `Refund IDs: ${(refundIds || []).join(', ') || '-'}`;

      return this.safeSend({
        to,
        subject: fallbackSubject,
        html,
        text,
        replyTo: opts?.replyTo,
        attachments: opts?.attachments,
      });
    }

    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
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

  /** ───────────────── Template rendering bridge ───────────────── */
  private async renderWithTemplates(
    templateName: string,
    locale: string | undefined,
    vars: Record<string, any>,
    fallbackSubject: string,
  ): Promise<
    { ok: true; subject: string; html: string; text: string } | { ok: false }
  > {
    try {
      // Import once, and treat as `any` to avoid compile-time property errors.
      const mod = (await import('@email-templates')) as any;

      // Accept multiple export shapes:
      const renderFn =
        (mod && typeof mod.render === 'function' && mod.render) ||
        (mod?.renderer &&
          typeof mod.renderer.render === 'function' &&
          mod.renderer.render) ||
        (typeof mod.renderTemplate === 'function' && mod.renderTemplate) ||
        null;

      // Subjects helper (subjectFor/subject)
      const subjectsObj = mod?.subjects || mod?.Subjects || {};
      const subjectFn =
        (typeof subjectsObj.subjectFor === 'function' &&
          subjectsObj.subjectFor) ||
        (typeof subjectsObj.subject === 'function' && subjectsObj.subject) ||
        null;

      if (!renderFn) return { ok: false };

      const data = { locale, ...vars };
      const out = await renderFn(templateName, data);
      const html: string = out?.html ?? '';
      const text: string =
        out?.text ?? (this.stripHtml(html).trim() || '[no text content]');
      const subject: string =
        (subjectFn ? subjectFn(templateName, locale, data) : null) ||
        fallbackSubject;

      if (!html) return { ok: false };
      return { ok: true, subject, html, text };
    } catch (e) {
      this.logger.warn(
        `[templates] render failed for ${templateName}: ${(e as Error).message}`,
      );
      return { ok: false };
    }
  }

  /** Map payload → template vars (shared between order-confirmed & receipt) */
  private payloadToVars(p: OrderEmailPayload) {
    const amount = this.formatMoney(p.amount, p.currency);
    return {
      orderId: p.orderId,
      paymentIntentId: p.paymentIntentId,
      amount, // formatted (₪ 12.34)
      amountMinor: p.amount,
      currency: (p.currency || 'ILS').toUpperCase(),
      invoiceUrl: p.invoiceUrl || null,

      // Optional branding/context for templates:
      brandName: process.env.MAIL_BRAND_NAME || 'Shop',
      brandUrl: process.env.PUBLIC_BASE_URL || '',
      assetsBaseUrl: process.env.MAIL_ASSETS_URL || '', // e.g. CDN path for /templates/assets
    };
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

  private stripHtml(html: string) {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/?[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
