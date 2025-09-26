// apps/api/src/payments/order-settings.ts
import { adminDb } from '@common/firebase';

const toMinor = (v: any) => Math.max(0, Math.round((Number(v) || 0) * 100));
const normalizeRate = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n : n / 100; // 0.17 or 17 => 0.17
};

export async function loadOrderSettings() {
  const snap = await adminDb.collection('order-settings').doc('default').get();
  const d = (snap.exists ? snap.data() : {}) as any;
  return {
    shippingMinor: toMinor(d?.shipping),
    discountMinor: toMinor(d?.discount),
    vatRate: normalizeRate(d?.taxRate),
  };
}
