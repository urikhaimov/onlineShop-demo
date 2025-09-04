// apps/api/src/orders/utils/stripe.util.ts

// Valid PaymentIntent id, e.g. "pi_3S3ZV..."
const PI_RE = /^pi_[A-Za-z0-9]+$/;

export function isValidPaymentIntentId(s: string): boolean {
  return PI_RE.test(s || '');
}

export function sanitizePaymentIntentId(s: string): string {
  const t = String(s || '').trim();
  if (!isValidPaymentIntentId(t)) throw new Error('Invalid payment intent id');
  return t;
}

/** Keep header values ASCII & token-safe (RFC7230-ish): letters, numbers, dot, dash, underscore */
export function toHeaderToken(v: string): string {
  return String(v ?? '').replace(/[^A-Za-z0-9._-]/g, '-');
}

/** Tiny non-crypto 32-bit FNV-1a hash → base36 */
export function hash32Base36(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const IDEMPOTENCY_MAX = 200;

/**
 * Build a Stripe Idempotency-Key that is:
 *  • deterministic per (uid, currency, amountMinor, cartSig)
 *  • header-safe (A–Z, a–z, 0–9, '.', '_', '-')
 *  • comfortably under limits (<255 chars)
 */
export function composePIIdempotencyKey(args: {
  uid: string;
  currency: string;
  amountMinor: number;
  cartSig?: string;
}): string {
  const uidHash = hash32Base36(args.uid || '');
  const cartHash = hash32Base36(args.cartSig || '');
  const cur = toHeaderToken((args.currency || 'USD').toUpperCase());
  const amt = Math.max(0, Math.round(Number(args.amountMinor) || 0));

  let key = `pi-${cur}-${amt}-${uidHash}-${cartHash}`;

  // Final hardening & length cap
  key = toHeaderToken(key);
  if (key.length > IDEMPOTENCY_MAX) key = key.slice(0, IDEMPOTENCY_MAX);
  return key;
}
