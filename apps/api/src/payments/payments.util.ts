// apps/api/src/payments/payments.util.ts

export type CartItem = { id: string; price: number; quantity: number }; // price in MAJOR units (₪), not cents

/** Convert major units to minor (₪ → agorot), clamped to ≥ 0 and rounded to cents. */
export const toMinor = (v: number): number =>
  Math.max(0, Math.round((Number.isFinite(v) ? v : 0) * 100));

/** Normalize VAT rate: accepts 0.17 or 17 → returns fraction (0.17). */
export const normalizeRate = (v: number | undefined | null): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n : n / 100;
};

/** Subtotal from items (minor units). */
export function calcSubtotalMinor(items: CartItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let subtotal = 0;
  for (const it of items) {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const unit = Math.max(0, Number(it.price) || 0);
    if (qty <= 0 || unit <= 0) continue;
    subtotal += toMinor(unit) * qty;
  }
  return subtotal;
}

export type CalcTotalsOptions = {
  /** Shipping in MAJOR units (₪). Default: 0 */
  shipping?: number;
  /** Discount in MAJOR units (₪). Default: 0 */
  discount?: number;
  /** VAT rate as fraction (0.17) or percent (17). Default: from env VAT_RATE or 0 */
  taxRate?: number;
  /** If true, VAT applies to shipping. Default: env VAT_APPLIES_TO_SHIPPING != '0' */
  vatAppliesToShipping?: boolean;
  /** If true, discount reduces VAT base. Default: env DISCOUNT_BEFORE_TAX != '0' */
  discountBeforeTax?: boolean;
};

export type TotalsMinor = {
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  vatRate: number; // fraction (e.g., 0.17)
  vatMinor: number;
  totalMinor: number;
};

// Env-driven defaults (keep utils side-effect free of I/O, just read env)
const VAT_APPLIES_TO_SHIPPING =
  String(process.env.VAT_APPLIES_TO_SHIPPING ?? '1') !== '0';
const DISCOUNT_BEFORE_TAX =
  String(process.env.DISCOUNT_BEFORE_TAX ?? '1') !== '0';

/** All-in-one totals calculator (minor units) with shipping, discount, and VAT. */
export function calcTotalsMinor(
  items: CartItem[],
  opts: CalcTotalsOptions = {},
): TotalsMinor {
  const subtotalMinor = calcSubtotalMinor(items);

  const shippingMinor = toMinor(opts.shipping ?? 0);
  const discountMinor = toMinor(opts.discount ?? 0);

  const vatRate =
    normalizeRate(
      opts.taxRate !== null ? opts.taxRate : Number(process.env.VAT_RATE),
    ) || 0;

  const vatBase =
    subtotalMinor +
    ((opts.vatAppliesToShipping ?? VAT_APPLIES_TO_SHIPPING)
      ? shippingMinor
      : 0) -
    ((opts.discountBeforeTax ?? DISCOUNT_BEFORE_TAX) ? discountMinor : 0);

  const vatMinor = Math.round(Math.max(0, vatBase) * vatRate);

  const totalMinor = Math.max(
    0,
    subtotalMinor + shippingMinor - discountMinor + vatMinor,
  );

  return {
    subtotalMinor,
    shippingMinor,
    discountMinor,
    vatRate,
    vatMinor,
    totalMinor,
  };
}

/**
 * Backward-compatible helper.
 * @deprecated Prefer `calcTotalsMinor(items, { shipping, discount, taxRate })`
 */
export function calcAmountMinor(items: CartItem[], shipping = 0): number {
  return calcTotalsMinor(items, { shipping }).totalMinor;
}
