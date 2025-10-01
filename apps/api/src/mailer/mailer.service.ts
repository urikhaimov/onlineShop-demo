import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import sgMail, { MailDataRequired } from '@sendgrid/mail';

// renderer (templates only)
import {
  render as renderTemplate,
  subjects as TemplateSubjects,
} from './templates';

/** ───────────────────────── Types ───────────────────────── */
type OrderEmailPayload = {
  orderId: string;
  amount: number; // minor units
  currency: string | null; // e.g., "ils"
  paymentIntentId: string;
  created: boolean;
  invoiceUrl?: string | null;
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
  status?: string;
  delivery?: {
    provider?: string;
    trackingNumber?: string;
    eta?: string | null;
  };
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: {
      line1?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
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
function safeGet(obj: any, pathStr: string): string | undefined {
  return String(pathStr)
    .split('.')
    .reduce<any>(
      (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined),
      obj,
    );
}
function templateStr(str: string, vars?: Record<string, any>): string {
  if (!str) return '';
  return str.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k.trim()];
    return v === undefined || v === null ? '' : String(v);
  });
}

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
  if (typeof val === 'string') return templateStr(val, vars);
  const en = safeGet(EN, key) as string | undefined;
  if (typeof en === 'string') return templateStr(en, vars);
  return templateStr(fallback ?? '', vars);
}

/** ───────────────────────── Utils (shared) ───────────────────────── */
function buildTrackingUrl(
  provider?: string,
  code?: string,
): string | undefined {
  if (!provider || !code) return undefined;
  const p = provider.toLowerCase();
  if (p.includes('wolt'))
    return `https://wolt.com/en/tracking/${encodeURIComponent(code)}`;
  return undefined;
}

/** ───────────────────────── Service ───────────────────────── */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter;
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

  /** ───────────────── Order confirmation / receipt (templates only) ───────────────── */
  async sendOrderConfirmation(
    to: string,
    payload: OrderEmailPayload,
    opts?: MailerOptions,
  ) {
    const { created, locale } = payload;
    const tplName = created ? 'order-confirmed' : 'payment-receipt';

    const rendered = await this.renderWithTemplates(
      tplName,
      locale,
      { ...this.payloadToVars(payload) },
      // used only if subject helper returns empty
      created
        ? `Order ${payload.orderId} confirmed — ${this.formatMoney(payload.amount, payload.currency)}`
        : `Payment received for ${payload.orderId} — ${this.formatMoney(payload.amount, payload.currency)}`,
    );
    if (!rendered.ok) {
      this.logger.warn(`[templates] ${tplName} missing/empty — email not sent`);
      return { ok: false };
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

  /** ───────────────── Order update (templates only) ───────────────── */
  async sendOrderUpdate(
    to: string,
    payload: OrderUpdatePayload,
    opts?: MailerOptions,
  ) {
    const { orderId, status, delivery, shippingAddress, locale } = payload;
    const statusKey = String(status || 'open').toLowerCase();

    const addr = shippingAddress?.address ?? {};
    const brandName = process.env.MAIL_BRAND_NAME || 'Shop';

    const baseVars = {
      orderId,
      status: statusKey,
      statusLabel:
        t(locale, `status.${statusKey}`, {}, status || '') || (status ?? ''),
      deliveryProvider: delivery?.provider ?? '',
      deliveryTracking: delivery?.trackingNumber ?? '',
      deliveryEta: delivery?.eta ?? '',
      deliveryTrackingUrl: buildTrackingUrl(
        delivery?.provider,
        delivery?.trackingNumber,
      ),
      shippingName: shippingAddress?.name || '',
      shippingPhone: shippingAddress?.phone || '',
      shippingLine1: addr.line1 || '',
      shippingCity: addr.city || '',
      shippingPostalCode: addr.postalCode || '',
      shippingCountry: addr.country || '',
      brandName,
      brandUrl: process.env.PUBLIC_BASE_URL || '',
      assetsBaseUrl: process.env.MAIL_ASSETS_URL || '',
      isRtl: (locale || '').toLowerCase().startsWith('he'),
    };

    const tplCandidates = [`order_${statusKey}`, 'order-update'];
    for (const name of tplCandidates) {
      const rendered = await this.renderWithTemplates(
        name,
        locale,
        baseVars,
        `${brandName} · ${baseVars.statusLabel || baseVars.status || 'Update'}`,
      );
      if (rendered.ok) {
        return this.safeSend({
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          replyTo: opts?.replyTo,
          attachments: opts?.attachments,
        });
      }
    }

    this.logger.warn(
      `[templates] order update templates missing/empty (status=${statusKey}) — email not sent`,
    );
    return { ok: false };
  }

  /** ───────────────── Refund (templates only) ───────────────── */
  async sendRefundEmail(
    to: string,
    payload: RefundEmailPayload,
    opts?: MailerOptions,
  ) {
    const { orderId, amount, currency, full, refundIds, locale, chargeId } =
      payload;

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
        brandName: process.env.MAIL_BRAND_NAME || 'Shop',
      },
      `${process.env.MAIL_BRAND_NAME || 'Shop'} · Refund · #${orderId}`,
    );

    if (!rendered.ok) {
      this.logger.warn('[templates] refund template missing/empty — not sent');
      return { ok: false };
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

  /** ───────────────── Core sender ───────────────── */
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
          `Email sent (provider=sendgrid) to ${opts.to} | subject="${opts.subject}" | status=${resp.statusCode}`,
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
        `Email sent (provider=${this.provider}) to ${opts.to} | subject="${opts.subject}" | id=${info.messageId ?? ''}`,
      );
      return { ok: true, id: info.messageId as string | undefined };
    } catch (e) {
      this.logger.error(`Email send failed: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  /** ───────────────── Template rendering bridge (templates only) ───────────────── */
  private async renderWithTemplates(
    templateName: string,
    locale: string | undefined,
    vars: Record<string, any>,
    fallbackSubject: string,
  ): Promise<
    { ok: true; subject: string; html: string; text: string } | { ok: false }
  > {
    try {
      const isRtl = (locale || process.env.MAIL_LOCALE || 'he')
        .toLowerCase()
        .startsWith('he');

      const data = {
        locale,
        dir: isRtl ? 'rtl' : 'ltr',
        isRtl,
        alignStart: isRtl ? 'right' : 'left',
        alignEnd: isRtl ? 'left' : 'right',
        ...vars,
      };

      const out = await renderTemplate(templateName, data);
      const html = out?.html ?? '';
      const textCandidate = out?.text ?? this.stripHtml(html).trim();

      // subject via helper, fallback to caller-provided
      const subjHelper = TemplateSubjects?.subjectFor?.(
        templateName,
        locale,
        data,
      );
      const subject = subjHelper || fallbackSubject;

      // Guard: tiny/empty HTML is considered a render failure
      const plain = this.stripHtml(html).trim();
      const needles = [
        String(vars.orderId || ''),
        String(vars.statusLabel || vars.status || ''),
      ].filter(Boolean);
      const looksEmpty =
        !html || plain.length < 30 || needles.every((n) => !html.includes(n));
      if (looksEmpty) return { ok: false };

      const text = textCandidate || '[no text content]';
      return { ok: true, subject, html, text };
    } catch (e) {
      this.logger.warn(
        `[templates] render failed for ${templateName}: ${(e as Error).message}`,
      );
      return { ok: false };
    }
  }

  /** Map payload → template vars */
  private payloadToVars(p: OrderEmailPayload) {
    const amount = this.formatMoney(p.amount, p.currency);
    return {
      orderId: p.orderId,
      paymentIntentId: p.paymentIntentId,
      amount,
      amountMinor: p.amount,
      currency: (p.currency || 'ILS').toUpperCase(),
      invoiceUrl: p.invoiceUrl || null,
      brandName: process.env.MAIL_BRAND_NAME || 'Shop',
      brandUrl: process.env.PUBLIC_BASE_URL || '',
      assetsBaseUrl: process.env.MAIL_ASSETS_URL || '',
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
