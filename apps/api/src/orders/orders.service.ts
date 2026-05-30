import { Inject, Injectable } from '@nestjs/common';

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
  getPublicStatusByPaymentIntent(orderId: string) {
    return this.queries.getPublicStatusByPaymentIntent(orderId);
  }
  getOrdersByUserId(userId: string) {
    return this.queries.getOrdersByUserId(userId);
  }
  getAllOrders() {
    return this.queries.getAllOrders();
  }
  getOrderById(userId: string, orderId: string, role = 'user') {
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
  markPaidByPaymentIntentId(orderId: string) {
    return this.lifecycle.markPaidByPaymentIntentId(orderId);
  }

  // Drafts
  saveDraftCheckoutDetails(input: {
    paypalOrderId: string;
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
  createPayPalOrder(input: {
    totalMajor?: number;
    currency?: string;
    userId: string;
    orderId?: string;
    email?: string;
    requestId?: string;
    cart?: any[];
  }) {
    return this.payments.createPayPalOrder(input);
  }
  capturePayPalOrder(input: {
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
    return this.payments.capturePayPalOrder(input);
  }

  // Webhooks
  handlePayPalWebhook(
    rawBody: string | Buffer,
    headers: {
      authAlgo?: string;
      certUrl?: string;
      transmissionId?: string;
      transmissionSig?: string;
      transmissionTime?: string;
    },
  ) {
    return this.webhooks.handlePayPalWebhook(rawBody, headers);
  }
}
