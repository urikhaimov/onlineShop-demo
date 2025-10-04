import Stripe from 'stripe';

export type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

export const nowIso = () => new Date().toISOString();

export function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function stripUndefinedDeep<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, any>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as unknown as T;
  }
  return value;
}

export function buildIdemKey(params: {
  provided?: string | undefined;
  userId: string;
  orderId?: string | undefined;
  amount: number;
  currency: string;
}) {
  const fallback = `pi:${params.orderId ?? 'no-order'}:${params.currency}:${params.amount}`;
  const base = (params.provided?.trim() || fallback).trim();
  const tagged = `${base}:${params.userId || 'anon'}`;
  return tagged.length > 255 ? tagged.slice(0, 255) : tagged;
}

export function isIdempotencyParamMismatch(e: any): boolean {
  const msg =
    (Array.isArray(e?.raw?.message)
      ? e.raw.message.join(', ')
      : e?.raw?.message) ||
    e?.message ||
    '';
  return /idempotent/i.test(msg) && /same parameters/i.test(msg);
}

export function extractPeopleFromStripe(pi: Stripe.PaymentIntent) {
  const charge =
    typeof pi.latest_charge === 'string' ? undefined : pi.latest_charge;
  const billing = charge?.billing_details;
  const ship = pi.shipping;

  const shippingAddress = ship?.address
    ? defined({
        name: ship?.name ?? billing?.name,
        phone: ship?.phone ?? billing?.phone,
        address: defined({
          line1: ship?.address?.line1,
          city: ship?.address?.city,
          postalCode: ship?.address?.postal_code,
          country: ship?.address?.country,
        }),
      })
    : undefined;

  const customer = defined({
    name: billing?.name ?? ship?.name,
    email: billing?.email,
    phone: billing?.phone ?? ship?.phone,
  });

  return { shippingAddress, customer };
}

export const toMinor = (v: any) =>
  Math.max(0, Math.round((Number(v) || 0) * 100));
export const normalizeRate = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n : n / 100; // accepts 0.17 or 17 → 0.17
};
