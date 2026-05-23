// apps/client/src/utils/orderSafe.ts

export const DASH = '—';

/** Loose coercion of many date-like shapes to a valid Date (or undefined). */
export function asDateLoose(value: any): Date | undefined {
  if (value === null) return undefined;

  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object') {
    // Firestore Timestamp object
    if (typeof (value as any).toDate === 'function') {
      const d = (value as any).toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
    }

    // Firestore proto-like shapes
    const seconds = Number((value as any).seconds ?? (value as any)._seconds);
    const nanos = Number(
      (value as any).nanoseconds ?? (value as any)._nanoseconds,
    );

    if (Number.isFinite(seconds) && Number.isFinite(nanos)) {
      const ms = seconds * 1000 + Math.round(nanos / 1e6);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
  }

  return undefined;
}

/** Return the first non-empty trimmed string; otherwise DASH. */
export function coalesce(...xs: unknown[]): string {
  for (const x of xs) {
    if (typeof x === 'string') {
      const s = x.trim();
      if (s) return s;
    }
  }
  return DASH;
}

/** Safe getter by path, e.g. recProp(o, ['metadata','customer','email']). */
export function recProp<T = unknown>(
  obj: any,
  path: Array<string | number>,
  fallback?: T,
): T | undefined {
  try {
    let cur = obj;
    for (const key of path) {
      if (cur === null) return fallback;
      cur = (cur as any)[key as any];
    }
    return (cur as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Like recProp but coerces to a trimmed string (or undefined). */
export function strProp(
  obj: any,
  path: Array<string | number>,
  fallback?: string,
): string | undefined {
  const v = recProp<any>(obj, path);
  if (typeof v === 'string') {
    const s = v.trim();
    return s ? s : fallback;
  }
  return fallback;
}

export type MaybeCustomer = { name?: string; email?: string; phone?: string };

/** Extract common customer fields from various possible order shapes. */
export function extractCustomer(order: any): MaybeCustomer {
  const name =
    strProp(order, ['customer', 'name']) ??
    strProp(order, ['user', 'name']) ??
    strProp(order, ['ownerName']) ??
    strProp(order, ['metadata', 'customer', 'name']) ??
    strProp(order, ['shippingAddress', 'name']);

  const email =
    strProp(order, ['customer', 'email']) ??
    strProp(order, ['user', 'email']) ??
    strProp(order, ['email']) ??
    strProp(order, ['metadata', 'customer', 'email']);

  const phone =
    strProp(order, ['customer', 'phone']) ??
    strProp(order, ['user', 'phone']) ??
    strProp(order, ['phone']) ??
    strProp(order, ['shippingAddress', 'phone']) ??
    strProp(order, ['metadata', 'customer', 'phone']);

  return { name, email, phone };
}

export const createdDate = (o: any): Date | undefined =>
  asDateLoose(o?.metadata?.createdAt ?? o?.createdAt);

export const updatedDate = (o: any): Date | undefined =>
  asDateLoose(o?.metadata?.updatedAt ?? o?.updatedAt);

/** Minor-unit decimal places per currency. Default 2 if unknown. */
export function currencyMinorUnit(currency?: string): number {
  const map: Record<string, number> = {
    // 0-decimal currencies
    JPY: 0,
    KRW: 0,
    VND: 0,
    HUF: 0,
    XOF: 0,
    XAF: 0,
    CLP: 0,
    MGA: 0,
    RWF: 0,
    // 3-decimal currencies
    JOD: 3,
    KWD: 3,
    BHD: 3,
    OMR: 3,
    TND: 3,
    // Common 2-decimal currencies
    USD: 2,
    EUR: 2,
    GBP: 2,
    ILS: 2,
    CAD: 2,
    AUD: 2,
    CHF: 2,
  };
  const code = (currency || '').toUpperCase();
  return map[code] ?? 2;
}

/** Convert integer minor units (e.g., agorot/cents) to a major-unit number. */
export function amountMinorToMajor(
  amountMinor: unknown,
  currency?: string,
): number {
  const n = Math.trunc(Number(amountMinor));
  if (!Number.isFinite(n)) return 0;
  const dec = currencyMinorUnit(currency);
  return n / Math.pow(10, dec);
}

/** Try to infer currency code from an order. */
export function currencyFromOrder(order: any): string | undefined {
  return (
    strProp(order, ['payment', 'currency']) ??
    strProp(order, ['currency']) ??
    undefined
  );
}

/** Normalize items array from various order shapes to {productId, name, quantity, price(major)}[] */
export function itemsFromOrder(order: any): Array<{
  productId?: string;
  name?: string;
  quantity: number;
  price?: number;
}> {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const currency = currencyFromOrder(order);

  return items.map((it: any) => {
    const quantity = Number.isFinite(Number(it?.quantity))
      ? Number(it.quantity)
      : 1;

    // Prefer major-unit price if available
    let priceMajor: number | undefined =
      typeof it?.price === 'number' && Number.isFinite(it.price)
        ? it.price
        : undefined;

    // Fallbacks for minor-unit fields (custom or provider-specific)
    const minorCandidates = [
      it?.unitAmount,
      it?.unit_amount,
      it?.amount,
      it?.priceInMinorUnits,
    ];
    if (priceMajor === undefined) {
      const minor = minorCandidates.find((v) => Number.isFinite(Number(v)));
      if (minor !== undefined) {
        priceMajor = amountMinorToMajor(minor, currency);
      }
    }

    const nameRaw =
      (typeof it?.name === 'string' && it.name) ||
      (typeof it?.productName === 'string' && it.productName) ||
      (typeof it?.title === 'string' && it.title) ||
      (typeof it?.sku === 'string' && it.sku) ||
      (typeof it?.productId === 'string' && it.productId) ||
      undefined;

    const name = typeof nameRaw === 'string' ? nameRaw.trim() : undefined;

    const productId =
      (typeof it?.productId === 'string' && it.productId) ||
      (typeof it?.sku === 'string' && it.sku) ||
      (typeof it?.id === 'string' && it.id) ||
      undefined;

    return { productId, name, quantity, price: priceMajor };
  });
}

/** Stable React list key for an order item row. */
export function keyForItem(
  it: { productId?: string; name?: string },
  idx: number,
): string {
  if (it?.productId && typeof it.productId === 'string') return it.productId;
  if (it?.name && typeof it.name === 'string' && it.name.trim())
    return `${it.name.trim()}-${idx}`;
  return `item-${idx}`;
}
