// libs/mailer/src/mailer.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  MailerConfig,
  MailerOptions,
  OrderEmailPayload,
  OrderUpdatePayload,
  RefundEmailPayload,
} from './mailer.types';
import type { MailTransport } from './transports/mail-transport';
import { TemplateRenderer } from './templates/renderer';
import { t } from './templates/i18n';

export const MAILER_CONFIG = 'MAILER_CONFIG';
export const MAIL_TRANSPORT = 'MAIL_TRANSPORT';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  constructor(
    @Inject(MAILER_CONFIG) private readonly cfg: MailerConfig,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly renderer: TemplateRenderer,
  ) {}

  async sendOrderConfirmation(
    to: string,
    p: OrderEmailPayload,
    opts?: MailerOptions,
  ) {
    const tpl = p.created ? 'order-confirmed' : 'payment-receipt';
    const vars = this.orderVars(p);
    const fallback = p.created
      ? `Order ${p.orderId} confirmed — ${vars.amount}`
      : `Payment received for ${p.orderId} — ${vars.amount}`;
    const out = await this.renderer.render(tpl, p.locale, vars, fallback);
    if (!out.ok) return { ok: false };
    const res = await this.transport.send({
      to,
      subject: out.subject,
      html: out.html,
      text: out.text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
    this.logResult(res.ok, to, out.subject);
    return res;
  }

  async sendOrderUpdate(
    to: string,
    p: OrderUpdatePayload,
    opts?: MailerOptions,
  ) {
    const statusKey = String(p.status || 'open').toLowerCase();
    const addr = p.shippingAddress?.address ?? {};
    const baseVars = {
      orderId: p.orderId,
      status: statusKey,
      statusLabel: t(p.locale, `status.${statusKey}`, {}, p.status || ''),
      deliveryProvider: p.delivery?.provider ?? '',
      deliveryTracking: p.delivery?.trackingNumber ?? '',
      deliveryEta: p.delivery?.eta ?? '',
      deliveryTrackingUrl: this.trackingUrl(
        p.delivery?.provider,
        p.delivery?.trackingNumber,
      ),
      shippingName: p.shippingAddress?.name || '',
      shippingPhone: p.shippingAddress?.phone || '',
      shippingLine1: addr.line1 || '',
      shippingCity: addr.city || '',
      shippingPostalCode: addr.postalCode || '',
      shippingCountry: addr.country || '',
      brandName: this.cfg.brandName,
      brandUrl: this.cfg.publicBaseUrl || '',
      assetsBaseUrl: this.cfg.assetsBaseUrl || '',
      supportEmail: this.supportEmail(),
      privacyUrl: this.cfg.publicBaseUrl
        ? `${this.cfg.publicBaseUrl}/privacy`
        : '',
      isRtl: (p.locale || this.cfg.defaultLocale) === 'he',
    };

    for (const name of [`order_${statusKey}`, 'order-update']) {
      const out = await this.renderer.render(
        name,
        p.locale,
        baseVars,
        `${this.cfg.brandName} · ${baseVars.statusLabel || baseVars.status || 'Update'}`,
      );
      if (out.ok) {
        const res = await this.transport.send({
          to,
          subject: out.subject,
          html: out.html,
          text: out.text,
          replyTo: opts?.replyTo,
          attachments: opts?.attachments,
        });
        this.logResult(res.ok, to, out.subject);
        return res;
      }
    }
    this.logger.warn(
      `[email] update skipped (no template) status=${statusKey}`,
    );
    return { ok: false };
  }

  async sendRefundEmail(
    to: string,
    p: RefundEmailPayload,
    opts?: MailerOptions,
  ) {
    const vars = {
      orderId: p.orderId,
      isFull: !!p.full,
      amountMinor: p.amount,
      amount: this.formatMoney(p.amount, p.currency),
      currency: (p.currency || 'ILS').toUpperCase(),
      chargeId: p.chargeId,
      refundIds: p.refundIds,
      brandName: this.cfg.brandName,
    };
    const out = await this.renderer.render(
      'refund',
      p.locale,
      vars,
      `${this.cfg.brandName} · Refund · #${p.orderId}`,
    );
    if (!out.ok) return { ok: false };
    const res = await this.transport.send({
      to,
      subject: out.subject,
      html: out.html,
      text: out.text,
      replyTo: opts?.replyTo,
      attachments: opts?.attachments,
    });
    this.logResult(res.ok, to, out.subject);
    return res;
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private orderVars(p: OrderEmailPayload) {
    return {
      orderId: p.orderId,
      paymentIntentId: p.paymentIntentId,
      amountMinor: p.amount,
      amount: this.formatMoney(p.amount, p.currency),
      currency: (p.currency || 'ILS').toUpperCase(),
      invoiceUrl: p.invoiceUrl || null,
      brandName: this.cfg.brandName,
      brandUrl: this.cfg.publicBaseUrl || '',
      assetsBaseUrl: this.cfg.assetsBaseUrl || '',
      supportEmail: this.supportEmail(),
      privacyUrl: this.cfg.publicBaseUrl
        ? `${this.cfg.publicBaseUrl}/privacy`
        : '',
    };
  }

  private supportEmail() {
    const m = this.cfg.fromAddress.match(/<(.+)>/);
    return m ? m[1].trim() : this.cfg.fromAddress;
  }

  private formatMoney(minor: number, currency: string | null) {
    const curr = (currency || 'ILS').toUpperCase();
    const major = (minor ?? 0) / 100;
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

  private trackingUrl(provider?: string, code?: string) {
    if (!provider || !code) return undefined;
    const p = provider.toLowerCase();
    if (p.includes('wolt'))
      return `https://wolt.com/en/tracking/${encodeURIComponent(code)}`;
    return undefined;
  }

  private logResult(ok: boolean, to: string, subject: string) {
    if (ok) this.logger.log(`Email sent → ${to} | "${subject}"`);
    else this.logger.warn(`Email NOT sent → ${to} | "${subject}"`);
  }
}
