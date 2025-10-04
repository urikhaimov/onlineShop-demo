import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { StripePaymentsService } from './stripe-payments.service';
import { nowIso, stripUndefinedDeep } from '../utils/orders.helpers';

@Injectable()
export class OrdersDraftsService {
  private readonly logger = new Logger(OrdersDraftsService.name);

  constructor(
    @Inject(OrdersRepository) private readonly repo: OrdersRepository,
    @Inject(StripePaymentsService)
    private readonly stripeSvc: StripePaymentsService,
  ) {}

  async saveDraftCheckoutDetails(input: {
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
    const {
      paymentIntentId,
      userId,
      items,
      customer,
      shippingAddress,
      updateStripePI,
    } = input;

    await this.repo.saveDraftMerge(
      paymentIntentId,
      stripUndefinedDeep({
        id: paymentIntentId,
        userId,
        items: Array.isArray(items) ? items : undefined,
        customer,
        shippingAddress,
        updatedAt: nowIso(),
      }),
    );

    if (updateStripePI && shippingAddress?.address) {
      await this.stripeSvc.updateShipping(paymentIntentId, {
        name: shippingAddress.name || customer?.name || undefined,
        phone: shippingAddress.phone || customer?.phone || undefined,
        address: {
          line1: shippingAddress.address.line1,
          city: shippingAddress.address.city,
          postal_code: shippingAddress.address.postalCode,
          country: shippingAddress.address.country,
        },
      });
    }

    this.logger.log(`saveDraftCheckoutDetails ${paymentIntentId}`);
    return this.repo.getOrder(paymentIntentId);
  }

  async cleanupOldDrafts(userId: string, keepId?: string, aggressive = false) {
    try {
      const recents = await this.repo.listByUser(userId, 50);
      const twoMinAgo = Date.now() - 2 * 60 * 1000;

      for (const d of recents) {
        const id = d.id;
        if (id === keepId) continue;
        if ((d as any)?.paymentIntentId === keepId) continue;
        if ((d as any)?.status !== 'open') continue;

        const createdAtMs = Date.parse((d as any)?.createdAt || '') || 0;
        if (!aggressive && createdAtMs > twoMinAgo) continue;

        try {
          const pi = await this.stripeSvc.retrieve(id);
          if (!['succeeded', 'canceled', 'processing'].includes(pi.status)) {
            await this.stripeSvc.cancel(id);
          }
        } catch {
          // Ignore errors
        }

        try {
          await this.repo.deleteOrder(id);
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Ignore errors
    }
  }

  async findMostRecentOpenOrderId(): Promise<string | null> {
    const snap = await this.repo
      .ordersCol()
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].id;
  }
}
