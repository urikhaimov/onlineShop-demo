import { Inject, Injectable } from '@nestjs/common';
// (Optional) Remove if unused:
// import type Stripe from 'stripe';

import { OrdersQueriesService } from './services/orders-queries.service';
import { OrdersLifecycleService } from './services/orders-lifecycle.service';
import { OrdersDraftsService } from './services/orders-drafts.service';
import { OrdersPaymentFlowService } from './services/orders-payment-flow.service';
import { OrdersWebhookService } from './services/orders-webhook.service';
import type { OrderStatus } from './utils/orders.helpers';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(OrdersQueriesService)
    private readonly queries: OrdersQueriesService,

    @Inject(OrdersLifecycleService)
    private readonly lifecycle: OrdersLifecycleService,

    @Inject(OrdersDraftsService)
    private readonly drafts: OrdersDraftsService,

    @Inject(OrdersPaymentFlowService)
    private readonly payments: OrdersPaymentFlowService,

    @Inject(OrdersWebhookService)
    private readonly webhooks: OrdersWebhookService,
  ) {}

  // Queries
  getPublicStatusByPaymentIntent(piId: string) {
    return this.queries.getPublicStatusByPaymentIntent(piId);
  }
  getOrdersByUserId(userId: string) {
    return this.queries.getOrdersByUserId(userId);
  }
  getAllOrders() {
    return this.queries.getAllOrders();
  }
  getOrderById(
    userId: string,
    orderId: string,
    role: 'admin' | 'user' | string = 'user',
  ) {
    return this.queries.getOrderById(userId, orderId, role);
  }
  getOrderDoc(orderId: string) {
    return this.queries.getOrderDoc(orderId);
  }

  // Lifecycle
  createOrder(dto: any) {
    return this.lifecycle.createOrder(dto);
  }
  updateOrder(id: string, dto: any, byUserId?: string) {
    return this.lifecycle.updateOrder(id, dto, byUserId);
  }
  updateStatus(orderId: string, status: OrderStatus) {
    return this.lifecycle.updateStatus(orderId, status);
  }
  markPaidByPaymentIntentId(paymentIntentId: string) {
    return this.lifecycle.markPaidByPaymentIntentId(paymentIntentId);
  }

  // Drafts
  saveDraftCheckoutDetails(input: {
    paymentIntentId: string;
    userId: string;
    items?: any[];
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
    updateStripePI?: boolean;
  }) {
    return this.drafts.saveDraftCheckoutDetails(input);
  }
  cleanupOldDrafts(userId: string, keepId?: string, aggressive = false) {
    return this.drafts.cleanupOldDrafts(userId, keepId, aggressive);
  }
  findMostRecentOpenOrderId() {
    return this.drafts.findMostRecentOpenOrderId();
  }

  // Payment flows
  createPaymentIntent(input: {
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
    return this.payments.createPaymentIntent(input);
  }
  confirmPaymentIntent(input: {
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
    return this.payments.confirmPaymentIntent(input);
  }
  createOrderFromIntentById(paymentIntentId: string, userId: string) {
    return this.payments.createOrderFromIntentById(paymentIntentId, userId);
  }

  // Webhooks
  handleStripeWebhook(rawBody: string | Buffer, signature?: string) {
    return this.webhooks.handleStripeWebhook(rawBody, signature);
  }
}
