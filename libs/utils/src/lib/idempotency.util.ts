// No Node 'crypto' here — pure string utilities

const SAFE_CHARS = /[^a-zA-Z0-9:_\-~,|.]/g; // strip anything not header-safe

export function sanitizeToken(s: string): string {
  return String(s || '').replace(SAFE_CHARS, '');
}

/** Short signature from cart content (ids, qty, price), max 80 chars */
export function cartSignature(
  cart?: Array<{
    productId?: string;
    id?: string;
    quantity?: number;
    price?: number;
  }>,
): string {
  if (!Array.isArray(cart) || cart.length === 0) return '0';
  const parts = cart.map((it, idx) => {
    const pid = sanitizeToken(it.productId ?? it.id ?? `i${idx}`).slice(0, 48);
    const qty = Math.max(1, Number(it.quantity ?? 1));
    const price = Number.isFinite(it.price as number) ? Number(it.price) : 0;
    return `${pid}~${qty}~${price}`;
  });
  return parts.join(',').slice(0, 80); // keep the header small
}

/** Compose a Stripe-safe Idempotency-Key header value */
export function composePIIdempotencyKey(opts: {
  uid: string;
  currency: string; // e.g. 'ILS'
  amountMinor: number; // integer
  cart?: Array<{
    productId?: string;
    id?: string;
    quantity?: number;
    price?: number;
  }>;
}): string {
  const uid = sanitizeToken(opts.uid);
  const cur = sanitizeToken(opts.currency.toUpperCase());
  const amt = Math.max(0, Math.round(opts.amountMinor || 0));
  const sig = cartSignature(opts.cart);
  // ONLY safe ASCII: letters/numbers/colon/hyphen/underscore
  return `pi:${uid}:${cur}:${amt}:${sig}`.slice(0, 255);
}
