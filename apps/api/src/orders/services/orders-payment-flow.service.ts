import {
  ConflictException,
  Injectable,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import type Stripe from 'stripe';

import { OrdersRepository } from '../repositories/orders.repository';
import { OrdersPricingService } from './orders-pricing.service';
import { StripePaymentsService } from './stripe-payments.service';
import { OrderNotificationsService } from './order-notifications.service';
import { OrdersDraftsService } from './orders-drafts.service';

import {
  defined,
  extractPeopleFromStripe,
  nowIso,
  stripUndefinedDeep,
} from '../utils/orders.helpers';

const SEND_FROM_ORDERS =
  String(process.env.SEND_STRIPE_EMAILS_FROM_ORDERS || '').toLowerCase() ===
  'true';

@Injectable()
export class OrdersPaymentFlowService {
  private readonly logger = new Logger(OrdersPaymentFlowService.name);

  constructor(
    @Inject(OrdersRepository)
    private readonly repo: OrdersRepository,

    @Inject(OrdersPricingService)
    private readonly pricing: OrdersPricingService,

    @Inject(StripePaymentsService)
    private readonly stripeSvc: StripePaymentsService,

    @Optional()
    @Inject(OrderNotificationsService)
    private readonly notify: OrderNotificationsService | undefined,

    @Inject(OrdersDraftsService)
    private readonly drafts: OrdersDraftsService,
  ) {}

  async createPaymentIntent(input: {
    totalMajor?: number;
    currency?: string;
    userId: string;
    orderId?: string;
    metadata?: Record<string, string>;
    email?: string;
    idempotencyKey?: string;
    cart?: any[];
    reuseIfSame?: boolean;
  }) {
    const currency = (input.currency ?? 'ils').toLowerCase();
    const totals = await this.pricing.computeTotals(
      input.cart,
      input.totalMajor,
    );

    const pi = await this.stripeSvc.createPaymentIntent({
      userId: input.userId,
      orderId: input.orderId,
      amountMinor: totals.amountMinor,
      currency,
      email: input.email,
      idempotencyKey: input.idempotencyKey,
      reuseIfSame: input.reuseIfSame,
      metadata: {
        userId: input.userId,
        orderId: input.orderId ?? '',
        app: 'onlineShop',
        ...(input.metadata ?? {}),
        ...(input.email ? { email: input.email } : {}),
        subtotal_minor: String(totals.subtotalMinor),
        shipping_minor: String(totals.shippingMinor),
        discount_minor: String(totals.discountMinor),
        vat_rate: String(totals.vatRate),
      },
    });

    await this.repo.saveDraftMerge(
      pi.id,
      stripUndefinedDeep({
        id: pi.id,
        userId: input.userId,
        status: 'open',
        total: totals.amountMinor / 100,
        totalMajor: totals.amountMinor / 100,
        totalMinor: totals.amountMinor,
        currency,
        items: Array.isArray(input.cart) ? input.cart : [],
        paymentIntentId: pi.id,
        payment: defined({
          provider: 'stripe',
          method: 'card',
          currency,
          totalMinor: totals.amountMinor,
          totalMajor: totals.amountMinor / 100,
          transactionId: pi.id,
          status: 'requires_confirmation',
        }),
        subtotalMinor: totals.subtotalMinor,
        shippingMinor: totals.shippingMinor,
        discountMinor: totals.discountMinor,
        vatRate: totals.vatRate,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    );

    this.logger.log(
      `createPaymentIntent ${pi.id} ${currency} ${totals.amountMinor}`,
    );
    await this.drafts.cleanupOldDrafts(input.userId, pi.id, false);

    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  }

  async confirmPaymentIntent(input: {
    paymentIntentId: string;
    userId: string;
    paymentMethodId?: string;
    customer?: { name?: string; email?: string; phone?: string };
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
    mirrorToStripe?: boolean;
    returnUrl?: string;
  }) {
    const {
      paymentIntentId,
      userId,
      paymentMethodId,
      customer,
      shippingAddress,
      mirrorToStripe,
      returnUrl,
    } = input;

    if (customer || shippingAddress) {
      await this.drafts.saveDraftCheckoutDetails({
        paymentIntentId,
        userId,
        customer,
        shippingAddress,
        updateStripePI: mirrorToStripe,
      });
    }

    let pi = await this.stripeSvc.retrieve(paymentIntentId, ['latest_charge']);

    switch (pi.status) {
      case 'succeeded': {
        const order = await this.createOrderFromIntentById(pi.id, userId);
        await this.drafts.cleanupOldDrafts(userId, order.id, true);
        return {
          ok: true,
          status: 'succeeded',
          order,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'requires_payment_method': {
        if (!paymentMethodId) {
          await this.drafts.cleanupOldDrafts(userId, pi.id, true);
          throw new ConflictException(
            'Payment method is missing. Attach a payment method and try again.',
          );
        }
        break;
      }
      case 'requires_confirmation': {
        break;
      }
      case 'requires_action':
      case 'processing': {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        return {
          ok: true,
          status: pi.status,
          nextAction: (pi as any).next_action ?? null,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'canceled': {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException('Payment was canceled.');
      }
      default: {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(`Cannot confirm in state: ${pi.status}`);
      }
    }

    pi = await this.stripeSvc.confirm(
      paymentIntentId,
      defined({ paymentMethodId, returnUrl }),
    );

    switch (pi.status) {
      case 'succeeded': {
        const order = await this.createOrderFromIntentById(pi.id, userId);
        await this.drafts.cleanupOldDrafts(userId, order.id, true);
        return {
          ok: true,
          status: 'succeeded',
          order,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'requires_action':
      case 'processing': {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        return {
          ok: true,
          status: pi.status,
          nextAction: (pi as any).next_action ?? null,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'canceled': {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException('Payment was canceled.');
      }
      default: {
        await this.drafts.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(
          `Confirmation ended in state: ${pi.status}`,
        );
      }
    }
  }

  async createOrderFromIntentById(paymentIntentId: string, userId: string) {
    const pi = await this.stripeSvc.retrieve(paymentIntentId, [
      'latest_charge',
    ]);
    const draft = await this.repo.getOrderRaw(pi.id);
    const { shippingAddress, customer } = extractPeopleFromStripe(pi);

    if (pi.status !== 'succeeded') {
      await this.repo.saveDraftMerge(
        pi.id,
        stripUndefinedDeep({
          status: 'open',
          shippingAddress: shippingAddress ?? (draft as any)?.shippingAddress,
          customer: Object.keys(customer).length
            ? customer
            : (draft as any)?.customer,
          updatedAt: nowIso(),
        }),
      );
      await this.drafts.cleanupOldDrafts(userId, pi.id, true);
      throw new ConflictException(
        `PaymentIntent ${pi.id} is ${pi.status}; cannot create order until it succeeds.`,
      );
    }

    const orderId = (pi.metadata?.orderId as string) || paymentIntentId;
    const currency = (
      pi.currency ||
      (draft as any)?.currency ||
      'ils'
    ).toLowerCase();
    const amountMinor =
      (typeof pi.amount_received === 'number' && pi.amount_received > 0
        ? pi.amount_received
        : typeof pi.amount === 'number'
          ? pi.amount
          : (draft as any)?.totalMinor) || 0;

    const m = pi.metadata || {};
    const subtotalMinor =
      Number(m.subtotal_minor) ||
      Number((draft as any)?.subtotalMinor) ||
      undefined;
    const shippingMinor =
      Number(m.shipping_minor) || Number((draft as any)?.shippingMinor) || 0;
    const discountMinor =
      Number(m.discount_minor) || Number((draft as any)?.discountMinor) || 0;
    const vatRate =
      m.vat_rate !== null && m.vat_rate !== undefined
        ? Number(m.vat_rate)
        : typeof (draft as any)?.vatRate === 'number'
          ? Number((draft as any).vatRate)
          : undefined;

    const payload = stripUndefinedDeep({
      id: orderId,
      userId,
      status: 'paid' as const,
      total: amountMinor / 100,
      totalMajor: amountMinor / 100,
      totalMinor: amountMinor,
      currency,
      items: Array.isArray((draft as any)?.items) ? (draft as any).items : [],
      paymentIntentId: pi.id,
      payment: {
        provider: 'stripe',
        method: 'card',
        currency,
        totalMinor: amountMinor,
        totalMajor: amountMinor / 100,
        transactionId: pi.id,
        status: pi.status,
      },
      shippingAddress: shippingAddress ?? (draft as any)?.shippingAddress,
      customer: Object.keys(customer).length
        ? customer
        : (draft as any)?.customer,
      subtotalMinor,
      shippingMinor,
      discountMinor,
      vatRate,
      createdAt: (draft as any)?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });

    await this.repo.saveOrderMerge(orderId, payload);
    await this.repo.saveDraftMerge(
      pi.id,
      stripUndefinedDeep({
        status: 'paid',
        linkedOrderId: orderId,
        shippingAddress: payload.shippingAddress,
        customer: payload.customer,
        updatedAt: nowIso(),
      }),
    );

    await this.drafts.cleanupOldDrafts(userId, orderId, true);
    await this.repo.decrementStockForOrder(orderId, payload.items || []);

    if (SEND_FROM_ORDERS) {
      await this.notify?.sendReceiptIfNeeded(orderId, pi, draft);
    }

    this.logger.log(`createOrderFromIntentById ${orderId} ← ${pi.status}`);
    return payload;
  }
}
