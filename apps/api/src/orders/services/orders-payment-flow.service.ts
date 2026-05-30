import {
  ConflictException,
  Injectable,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';

import { OrdersRepository } from '../repositories/orders.repository';
import { OrdersPricingService } from './orders-pricing.service';
import { PayPalPaymentsService, PayPalOrder } from './paypal-payments.service';
import { OrderNotificationsService } from './order-notifications.service';
import { OrdersDraftsService } from './orders-drafts.service';

import { defined, nowIso, stripUndefinedDeep } from '../utils/orders.helpers';
import {
  extractPeopleFromCapture,
  extractCaptureId,
} from '../utils/paypal-parse.util';

const SEND_FROM_ORDERS =
  String(process.env.SEND_PAYPAL_EMAILS_FROM_ORDERS || '').toLowerCase() ===
  'true';

@Injectable()
export class OrdersPaymentFlowService {
  private readonly logger = new Logger(OrdersPaymentFlowService.name);

  constructor(
    @Inject(OrdersRepository)
    private readonly repo: OrdersRepository,

    @Inject(OrdersPricingService)
    private readonly pricing: OrdersPricingService,

    @Inject(PayPalPaymentsService)
    private readonly paypalSvc: PayPalPaymentsService,

    @Optional()
    @Inject(OrderNotificationsService)
    private readonly notify: OrderNotificationsService | undefined,

    @Inject(OrdersDraftsService)
    private readonly drafts: OrdersDraftsService,
  ) {}

  async createPayPalOrder(input: {
    totalMajor?: number;
    currency?: string;
    userId: string;
    orderId?: string;
    email?: string;
    requestId?: string;
    cart?: any[];
  }) {
    const currency = (input.currency ?? 'ils').toLowerCase();
    const totals = await this.pricing.computeTotals(
      input.cart,
      input.totalMajor,
    );

    const paypalOrder = await this.paypalSvc.createOrder({
      amountMinor: totals.amountMinor,
      currency,
      orderId: input.orderId,
      requestId: input.requestId,
    });

    await this.repo.saveDraftMerge(
      paypalOrder.id,
      stripUndefinedDeep({
        id: paypalOrder.id,
        userId: input.userId,
        status: 'open',
        total: totals.amountMinor / 100,
        totalMajor: totals.amountMinor / 100,
        totalMinor: totals.amountMinor,
        currency,
        items: Array.isArray(input.cart) ? input.cart : [],
        paypalOrderId: paypalOrder.id,
        payment: defined({
          provider: 'paypal',
          method: 'paypal',
          currency,
          totalMinor: totals.amountMinor,
          totalMajor: totals.amountMinor / 100,
          transactionId: paypalOrder.id,
          status: 'pending',
        }),
        subtotalMinor: totals.subtotalMinor,
        shippingMinor: totals.shippingMinor,
        discountMinor: totals.discountMinor,
        vatRate: totals.vatRate,
        ...(input.email ? { email: input.email } : {}),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    );

    await this.drafts.cleanupOldDrafts(input.userId, paypalOrder.id, false);

    this.logger.log(
      `createPayPalOrder ${paypalOrder.id} ${currency} ${totals.amountMinor}`,
    );

    return { orderId: paypalOrder.id };
  }

  async capturePayPalOrder(input: {
    orderId: string;
    userId: string;
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
  }) {
    const { orderId, userId } = input;

    const captureResult = await this.paypalSvc.captureOrder(orderId);

    if (captureResult.status !== 'COMPLETED') {
      throw new ConflictException(
        `PayPal order ${orderId} capture ended in status: ${captureResult.status}`,
      );
    }

    const order = await this.createOrderFromCapture(captureResult, userId, {
      customer: input.customer,
      shippingAddress: input.shippingAddress,
    });

    await this.drafts.cleanupOldDrafts(userId, order.id, true);
    return { ok: true, status: 'succeeded', order };
  }

  async createOrderFromCapture(
    captureResult: PayPalOrder,
    userId: string,
    overrides?: {
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
    },
  ) {
    if (captureResult.status !== 'COMPLETED') {
      throw new ConflictException(
        `PayPal order ${captureResult.id} is ${captureResult.status}; cannot create order.`,
      );
    }

    const draft = await this.repo.getOrderRaw(captureResult.id);
    const { shippingAddress: capturedShipping, customer: capturedCustomer } =
      extractPeopleFromCapture(captureResult);
    const captureId = extractCaptureId(captureResult);

    const unit = captureResult.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const amountValue = capture?.amount?.value ?? unit?.amount?.value ?? '0';
    const amountMinor = Math.round(parseFloat(amountValue) * 100);
    const currency = (
      capture?.amount?.currency_code ??
      unit?.amount?.currency_code ??
      (draft as any)?.currency ??
      'ILS'
    ).toLowerCase();

    const orderId = (draft as any)?.id ?? captureResult.id;

    const customer =
      overrides?.customer ??
      (Object.keys(capturedCustomer).length
        ? capturedCustomer
        : (draft as any)?.customer) ??
      {};
    const shippingAddress =
      overrides?.shippingAddress ??
      capturedShipping ??
      (draft as any)?.shippingAddress;

    const payload = stripUndefinedDeep({
      id: orderId,
      userId,
      status: 'paid' as const,
      total: amountMinor / 100,
      totalMajor: amountMinor / 100,
      totalMinor: amountMinor,
      currency,
      items: Array.isArray((draft as any)?.items) ? (draft as any).items : [],
      paypalOrderId: captureResult.id,
      paypalCaptureId: captureId,
      payment: {
        provider: 'paypal',
        method: 'paypal',
        currency,
        totalMinor: amountMinor,
        totalMajor: amountMinor / 100,
        transactionId: captureId ?? captureResult.id,
        status: 'COMPLETED',
      },
      shippingAddress,
      customer,
      subtotalMinor: (draft as any)?.subtotalMinor,
      shippingMinor: (draft as any)?.shippingMinor,
      discountMinor: (draft as any)?.discountMinor,
      vatRate: (draft as any)?.vatRate,
      createdAt: (draft as any)?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });

    await this.repo.saveOrderMerge(orderId, payload);
    await this.repo.saveDraftMerge(
      captureResult.id,
      stripUndefinedDeep({
        status: 'paid',
        linkedOrderId: orderId,
        shippingAddress: payload.shippingAddress,
        customer: payload.customer,
        updatedAt: nowIso(),
      }),
    );

    await this.repo.decrementStockForOrder(orderId, payload.items || []);

    if (SEND_FROM_ORDERS && this.notify) {
      this.logger.log('[email] SEND_FROM_ORDERS=true; sending receipt (async)');
      void this.notify
        .sendReceiptForPayPalOrder(orderId, captureResult, draft)
        .catch((e: Error) =>
          this.logger.warn(`sendReceiptForPayPalOrder failed: ${e?.message}`),
        );
    }

    this.logger.log(`createOrderFromCapture ${orderId} ← COMPLETED`);
    return payload;
  }
}
