// apps/api/src/orders/utils/cart.util.ts

/** Tiny cart signature for idempotency derivation */
export function cartSignature(
  cart?: Array<{
    productId?: string;
    id?: string;
    quantity?: number;
    price?: number;
  }>,
): string {
  if (!Array.isArray(cart) || cart.length === 0) return '0';
  const parts = cart.map((i, idx) => {
    const pid = String(i.productId ?? i.id ?? idx)
      .replace(/[~,|:]/g, '')
      .slice(0, 48);
    const q = Math.max(1, Number(i.quantity ?? 1));
    const p = Number(i.price ?? 0);
    return `${pid}~${q}~${p}`;
  });
  return parts.join(',').slice(0, 120);
}

/** Compact cart for Stripe metadata (<=500 chars per value) */
export function buildItemsCompact(
  cart?: Array<{
    productId?: string;
    id?: string;
    quantity?: number;
    price?: number;
  }>,
): { compact?: string; count: number } {
  if (!Array.isArray(cart) || cart.length === 0)
    return { compact: undefined, count: 0 };
  const parts = cart.map((i, idx) => {
    const pid = String(i.productId ?? i.id ?? `i${idx}`)
      .replace(/[~,|:]/g, '')
      .slice(0, 48);
    const q = Math.max(1, Number(i.quantity ?? 1));
    const p = Number(i.price ?? 0);
    return `${pid}~${q}~${p}`;
  });
  let compact = parts.join(',');
  if (compact.length > 480) compact = compact.slice(0, 480); // headroom under 500
  return { compact, count: cart.length };
}
