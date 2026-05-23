import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { nowIso, stripUndefinedDeep } from '../utils/orders.helpers';

@Injectable()
export class OrdersDraftsService {
  private readonly logger = new Logger(OrdersDraftsService.name);

  constructor(
    @Inject(OrdersRepository) private readonly repo: OrdersRepository,
  ) {}

  async saveDraftCheckoutDetails(input: {
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
    const { paypalOrderId, userId, items, customer, shippingAddress } = input;

    await this.repo.saveDraftMerge(
      paypalOrderId,
      stripUndefinedDeep({
        id: paypalOrderId,
        userId,
        items: Array.isArray(items) ? items : undefined,
        customer,
        shippingAddress,
        updatedAt: nowIso(),
      }),
    );

    this.logger.log(`saveDraftCheckoutDetails ${paypalOrderId}`);
    return this.repo.getOrder(paypalOrderId);
  }

  async cleanupOldDrafts(userId: string, keepId?: string, aggressive = false) {
    try {
      const recents = await this.repo.listByUser(userId, 50);
      const twoMinAgo = Date.now() - 2 * 60 * 1000;

      for (const d of recents) {
        const id = d.id;
        if (id === keepId) continue;
        if ((d as any)?.paypalOrderId === keepId) continue;
        if ((d as any)?.status !== 'open') continue;

        const createdAtMs = Date.parse((d as any)?.createdAt || '') || 0;
        if (!aggressive && createdAtMs > twoMinAgo) continue;

        try {
          await this.repo.deleteOrder(id);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
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
