// PayPal order IDs: uppercase alphanumeric, typically 17 characters
const PAYPAL_ORDER_RE = /^[A-Z0-9]{8,64}$/;

export function isValidPayPalOrderId(s: string): boolean {
  return PAYPAL_ORDER_RE.test(s || '');
}

/** Keep header values ASCII & token-safe */
function toHeaderToken(v: string): string {
  return String(v ?? '').replace(/[^A-Za-z0-9._-]/g, '-');
}

/** Tiny non-crypto 32-bit FNV-1a hash → base36 */
function hash32Base36(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Build a stable PayPal-Request-Id per (uid, currency, amountMinor, cartSig) */
export function composeOrderRequestId(args: {
  uid: string;
  currency: string;
  amountMinor: number;
  cartSig?: string;
}): string {
  const uidHash = hash32Base36(args.uid || '');
  const cartHash = hash32Base36(args.cartSig || '');
  const cur = toHeaderToken((args.currency || 'USD').toUpperCase());
  const amt = Math.max(0, Math.round(Number(args.amountMinor) || 0));
  const key = toHeaderToken(`pp-${cur}-${amt}-${uidHash}-${cartHash}`);
  return key.length > 200 ? key.slice(0, 200) : key;
}
