import { Injectable, Logger, Optional } from '@nestjs/common';
import { MailerService } from '../../mailer/mailer.service';
import { InvoiceService } from '../../invoice/invoice.service';
import type { PayPalOrder } from './paypal-payments.service';
import { nowIso } from '../utils/orders.helpers';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);

  constructor(
    private readonly repo: OrdersRepository,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly invoice?: InvoiceService,
  ) {}

  private getEmailFromOrder(order: any): string | undefined {
    return (
      order?.email ||
      order?.customer?.email ||
      order?.payment?.receipt_email ||
      undefined
    );
  }
  private getLocaleForOrder(order?: any): 'he' | 'en' {
    const c =
      order?.locale ||
      order?.shippingAddress?.address?.country ||
      order?.payment?.charges?.data?.[0]?.billing_details?.address?.country ||
      '';
    return String(c).toUpperCase() === 'IL' ? 'he' : 'en';
  }

  /** New: send "order-confirmed" (created=true) once per order */
  async sendCreatedConfirmationIfNeeded(order: any) {
    try {
      if (!this.mailer?.sendOrderConfirmation) return;

      const ref = this.repo.ordersCol().doc(order.id);
      const snap = await ref.get();
      const already = snap.exists
        ? (snap.get('confirmationSentAt') as string | undefined)
        : undefined;
      if (already) {
        this.logger.log(
          `confirmation already sent for ${order.id} @ ${already}`,
        );
        return;
      }

      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`no recipient email for order ${order.id}`);
        return;
      }

      const currency = (order?.currency || order?.payment?.currency || 'ILS')
        .toString()
        .toUpperCase();
      const amountMinor = Number(
        order?.totalMinor ??
          order?.payment?.totalMinor ??
          Math.round((order?.total || 0) * 100),
      );
      const locale = this.getLocaleForOrder(order);

      await this.mailer.sendOrderConfirmation(to, {
        orderId: String(order.id || order.paymentIntentId || ''),
        amount: amountMinor || 0,
        currency,
        paymentIntentId:
          order?.paymentIntentId ||
          order?.payment?.transactionId ||
          String(order.id),
        created: true,
        locale,
      });

      await ref.set(
        { confirmationSentAt: nowIso(), updatedAt: nowIso() },
        { merge: true },
      );
      this.logger.log(`order confirmation sent for ${order.id} → ${to}`);
    } catch (e) {
      this.logger.warn(
        `sendCreatedConfirmationIfNeeded failed for ${order?.id}: ${(e as Error).message}`,
      );
    }
  }

  async sendManualReceiptIfNeeded(order: any) {
    try {
      if (!this.mailer?.sendOrderConfirmation) return;

      const snap = await this.repo.ordersCol().doc(order.id).get();
      const already = snap.exists
        ? (snap.get('receiptSentAt') as string | undefined)
        : undefined;
      if (already) {
        this.logger.log(`receipt already sent for ${order.id} @ ${already}`);
        return;
      }

      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`no recipient email for order ${order.id}`);
        return;
      }

      let invoiceUrl: string | undefined;
      try {
        if (this.invoice?.ensureInvoice) {
          const inv = await this.invoice.ensureInvoice(order.id, {
            force: false,
          });
          invoiceUrl = inv?.url;
        }
      } catch (e) {
        this.logger.warn(
          `ensureInvoice failed for ${order.id}: ${(e as Error).message}`,
        );
      }

      const currency = (order?.currency || order?.payment?.currency || 'ILS')
        .toString()
        .toUpperCase();
      const amountMinor = Number(
        order?.totalMinor ??
          order?.payment?.totalMinor ??
          Math.round((order?.total || 0) * 100),
      );

      await this.mailer.sendOrderConfirmation(to, {
        orderId: String(order.id),
        amount: amountMinor || 0,
        currency,
        paymentIntentId:
          order?.paymentIntentId || order?.payment?.transactionId,
        created: false,
        invoiceUrl,
        locale: this.getLocaleForOrder(order),
      });

      await this.repo.saveOrderMerge(order.id, {
        receiptSentAt: nowIso(),
        updatedAt: nowIso(),
      });
      this.logger.log(`receipt sent for ${order.id} → ${to}`);
    } catch (e) {
      this.logger.warn(
        `sendManualReceiptIfNeeded failed for ${order?.id}: ${(e as Error).message}`,
      );
    }
  }

  async notifyCustomer(
    order: any,
    patch: any = {},
    actor?: { uid?: string; email?: string } | null,
  ) {
    try {
      if (!this.mailer) return;
      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`notifyCustomer: no recipient email for ${order?.id}`);
        return;
      }

      const orderId = String(order.id || order.paymentIntentId || '');
      const status: string | undefined = (patch?.status ??
        order?.status) as any;

      const delivery = {
        provider: patch?.delivery?.provider ?? order?.delivery?.provider,
        trackingNumber:
          patch?.delivery?.trackingNumber ?? order?.delivery?.trackingNumber,
        eta: patch?.delivery?.eta ?? order?.delivery?.eta,
      };

      const shippingAddress =
        patch?.shippingAddress ?? order?.shippingAddress ?? undefined;

      const locale: 'he' | 'en' = this.getLocaleForOrder(order);

      if (typeof (this.mailer as any)?.sendOrderUpdate === 'function') {
        await (this.mailer as any).sendOrderUpdate.call(
          this.mailer,
          to,
          { orderId, status, delivery, shippingAddress, locale },
          undefined,
        );
      } else if (this.mailer.sendOrderConfirmation) {
        const currency = (order?.currency || order?.payment?.currency || 'ILS')
          .toString()
          .toUpperCase();
        const amountMinor = Number(
          order?.totalMinor ??
            order?.totalAmount ??
            Math.round((order?.total || 0) * 100),
        );
        await this.mailer.sendOrderConfirmation(to, {
          orderId,
          amount: amountMinor || 0,
          currency,
          paymentIntentId:
            order?.paymentIntentId || order?.payment?.transactionId || orderId,
          created: false,
          locale,
        });
      } else {
        this.logger.warn('notifyCustomer: no mailer method available');
      }

      this.logger.log(
        `notifyCustomer: mailed ${to} for order ${orderId} (by=${actor?.uid ?? 'system'})`,
      );
    } catch (e) {
      this.logger.warn(
        `notifyCustomer failed for ${order?.id}: ${(e as Error).message}`,
      );
    }
  }

  async sendReceiptForPayPalOrder(
    orderId: string,
    captureResult: PayPalOrder,
    draft?: any,
  ) {
    try {
      if (!this.mailer?.sendOrderConfirmation) return;

      const ref = this.repo.ordersCol().doc(orderId);
      const snap = await ref.get();

      const alreadyAt = snap.exists
        ? (snap.get('receiptSentAt') as string | undefined)
        : undefined;
      const alreadyFor = snap.exists
        ? (snap.get('receiptSentFor') as string | undefined)
        : undefined;
      if (alreadyAt) {
        this.logger.log(
          `receipt already stamped for ${orderId} @ ${alreadyAt}${
            alreadyFor ? ` (for=${alreadyFor})` : ''
          }`,
        );
        return;
      }

      const to =
        captureResult.payer?.email_address?.trim() ||
        (draft?.customer?.email as string | undefined) ||
        (draft?.email as string | undefined);

      if (!to) {
        this.logger.warn(
          `no recipient email for order ${orderId} (paypalOrder=${captureResult.id})`,
        );
        return;
      }

      let invoiceUrl: string | undefined;
      try {
        if (this.invoice?.ensureInvoice) {
          const inv = await this.invoice.ensureInvoice(orderId, {
            force: false,
          });
          invoiceUrl = inv?.url;
        }
      } catch (e) {
        this.logger.warn(
          `ensureInvoice failed for ${orderId}: ${(e as Error).message}`,
        );
      }

      const unit = captureResult.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      const amountValue = capture?.amount?.value ?? unit?.amount?.value ?? '0';
      const amountMinor = Math.round(parseFloat(amountValue) * 100);
      const currency = (
        capture?.amount?.currency_code ??
        unit?.amount?.currency_code ??
        'ILS'
      ).toUpperCase();

      await this.mailer.sendOrderConfirmation(to, {
        orderId,
        amount: amountMinor,
        currency,
        paymentIntentId: captureResult.id,
        created: false,
        invoiceUrl,
        locale: this.getLocaleForOrder({
          shippingAddress: draft?.shippingAddress,
        }),
      });

      await ref.set(
        {
          receiptSentAt: nowIso(),
          receiptSentFor: captureResult.id,
          updatedAt: nowIso(),
        },
        { merge: true },
      );
      this.logger.log(
        `receipt sent for ${orderId} (paypalOrder=${captureResult.id}) → ${to}`,
      );
    } catch (e) {
      this.logger.warn(
        `sendReceiptForPayPalOrder failed for ${orderId}: ${(e as Error).message}`,
      );
    }
  }
}
