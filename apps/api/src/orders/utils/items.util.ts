import type { CreateOrderDto } from '../dto/create-order.dto';
import type { PlainItem, CompactCartItem } from '../types';

/** Normalize incoming DTO items */
export function toPlainItems(items: CreateOrderDto['items']): PlainItem[] {
  return (items || []).map((it: any) => ({
    productId: String(it?.productId ?? ''),
    name: String(it?.name ?? ''),
    price: Number(it?.price ?? 0),
    image: typeof it?.image === 'string' ? it.image : (it?.image ?? null),
    quantity: Number(it?.quantity ?? 0),
  }));
}

/** Build compact cart string safe for Stripe metadata (<= 500 chars per value) */
export function buildItemsCompact(cart?: CompactCartItem[]): {
  compact?: string;
  count: number;
} {
  const items = Array.isArray(cart) ? cart : [];
  const count = items.length;
  if (!count) return { compact: undefined, count: 0 };

  // pid~qty~priceMajor, comma separated. Strip separators and trim id.
  const parts = items.map((it, idx) => {
    const rawId = String(it.productId ?? it.id ?? `i${idx}`);
    const pid = rawId.replace(/[~,|:]/g, '').slice(0, 48);
    const qty = Math.max(1, Number(it.quantity ?? 1));
    const price = Number.isFinite(it.price as number) ? Number(it.price) : 0;
    return `${pid}~${qty}~${price}`;
  });

  let compact = parts.join(',');
  if (compact.length > 480) compact = compact.slice(0, 480); // keep headroom
  return { compact, count };
}

/** Parse legacy JSON string from PI metadata (if present) */
export function parseItemsJson(json?: string): PlainItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((i: any, idx: number) => ({
      productId: String(i?.productId ?? i?.id ?? `i${idx}`),
      name: String(i?.name ?? ''),
      price: Number(i?.priceMajor ?? i?.price ?? 0),
      image: typeof i?.image === 'string' ? i.image : null,
      quantity: Number(i?.quantity ?? 0),
    }));
  } catch {
    return [];
  }
}

/** Parse compact items string from PI metadata */
export function parseItemsCompact(compact?: string): PlainItem[] {
  if (!compact) return [];
  try {
    return compact
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, idx) => {
        const [pid, q, pr] = p.split('~');
        return {
          productId: (pid || `i${idx}`).trim(),
          name: '',
          price: Number(pr ?? 0),
          image: null,
          quantity: Number(q ?? 0),
        } as PlainItem;
      });
  } catch {
    return [];
  }
}
