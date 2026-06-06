import { Injectable, Logger } from '@nestjs/common';
import { FieldValue, DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@common/firebase';
import { nowIso } from '../utils/orders.helpers';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  ordersCol() {
    return adminDb.collection('orders');
  }
  productsCol() {
    return adminDb.collection('products');
  }
  settingsDoc() {
    return adminDb.collection('order-settings').doc('default');
  }

  // Reads
  async findPublicByPaymentIntentId(piId: string) {
    const byId = await this.ordersCol().doc(piId).get();
    if (byId.exists) return { id: byId.id, ...(byId.data() as any) };
    const q = await this.ordersCol()
      .where('paymentIntentId', '==', piId)
      .limit(1)
      .get();
    if (!q.empty) return { id: q.docs[0].id, ...(q.docs[0].data() as any) };
    return null;
  }

  async getOrder(id: string) {
    const snap = await this.ordersCol().doc(id).get();
    return snap.exists ? { id: snap.id, ...(snap.data() as any) } : null;
  }

  async getOrderRaw(id: string) {
    const snap = await this.ordersCol().doc(id).get();
    return snap.exists ? (snap.data() as any) : null;
  }

  async listByUser(userId: string, limit = 100) {
    const snap = await this.ordersCol()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  async listAll(limit = 200) {
    const snap = await this.ordersCol()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  // Writes
  async saveOrderMerge(id: string, payload: any) {
    await this.ordersCol().doc(id).set(payload, { merge: true });
  }

  async saveDraftMerge(id: string, payload: any) {
    await this.ordersCol().doc(id).set(payload, { merge: true });
  }

  async deleteOrder(id: string) {
    await this.ordersCol().doc(id).delete();
  }

  async markPaid(id: string) {
    await this.ordersCol()
      .doc(id)
      .set({ status: 'paid', updatedAt: nowIso() }, { merge: true });
  }

  async decrementStockForOrder(orderId: string, items: any[] = []) {
    if (!Array.isArray(items) || items.length === 0) {
      await this.saveOrderMerge(orderId, {
        stockDecrementedAt: nowIso(),
        updatedAt: nowIso(),
      });
      return { updated: 0, skipped: items.length, errors: 0 };
    }

    const qtyById = new Map<string, number>();
    for (const it of items) {
      const productId = String(it.productId || it.id || '').trim();
      const qty = Math.max(0, Number(it.quantity ?? it.qty ?? 1) || 0);
      if (!productId || qty <= 0) continue;
      qtyById.set(productId, (qtyById.get(productId) || 0) + qty);
    }
    const productIds = [...qtyById.keys()];
    if (productIds.length === 0) {
      await this.saveOrderMerge(orderId, {
        stockDecrementedAt: nowIso(),
        updatedAt: nowIso(),
      });
      return { updated: 0, skipped: items.length, errors: 0 };
    }

    const res = await adminDb.runTransaction(async (tx) => {
      const orderRef = this.ordersCol().doc(orderId);

      // A) read order
      const orderSnap = await tx.get(orderRef);
      const already = orderSnap.exists && orderSnap.get('stockDecrementedAt');
      if (already) return { updated: 0, skipped: 0, errors: 0, already: true };

      // B) read products
      const productRefs = productIds.map((id) => this.productsCol().doc(id));
      const snaps: DocumentSnapshot[] = await Promise.all(
        productRefs.map((r) => tx.get(r)),
      );

      // C) writes
      let updated = 0,
        errors = 0;
      snaps.forEach((snap, i) => {
        const ref = productRefs[i];
        const id = ref.id;
        const need = qtyById.get(id)!;

        if (!snap.exists) {
          this.logger.warn(`missing product ${id} (order=${orderId})`);
          errors++;
          return;
        }

        const curr = snap.data() as any;
        const stock = Math.max(0, Number(curr?.stock ?? 0));
        const newStock = Math.max(0, stock - need);

        tx.update(ref, {
          stock: newStock,
          sold: FieldValue.increment(need),
          updatedAt: nowIso(),
        });
        updated++;
      });

      tx.set(
        orderRef,
        { stockDecrementedAt: nowIso(), updatedAt: nowIso() },
        { merge: true },
      );
      return { updated, skipped: 0, errors, already: false };
    });

    return res;
  }
}
