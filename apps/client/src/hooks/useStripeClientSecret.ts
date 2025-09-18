// apps/client/src/hooks/useStripeClientSecret.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

type CartItem = {
  id?: string;
  productId?: string;
  name?: string;
  price?: number; // MAJOR
  image?: string;
  images?: string[];
  quantity?: number;
};

// ── zero-decimal helpers ──────────────────────────────────────────────────────
const ZERO_DEC = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);
const toMinor = (major: number, currency: string) =>
  ZERO_DEC.has(currency.toUpperCase())
    ? Math.round(Number(major) || 0)
    : Math.round((Number(major) || 0) * 100);

// ── tiny stable hash ──────────────────────────────────────────────────────────
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// ── request key (idempotency) ────────────────────────────────────────────────
function buildIdemKey(params: {
  currency: string;
  amountMinor: number;
  shippingMajor: number;
  taxRatePercent: number;
  discountMajor: number;
  cartPayload: { productId: string; price: number; quantity: number }[];
  salt?: string; // only for manual refresh / recovery
}) {
  const basis = {
    c: params.currency,
    a: params.amountMinor,
    s: params.shippingMajor,
    t: params.taxRatePercent,
    d: params.discountMajor,
    items: params.cartPayload.map((i) => ({
      id: i.productId,
      p: i.price,
      q: i.quantity,
    })),
  };
  const fp = hashStr(JSON.stringify(basis));
  return `pi:${params.currency}:${params.amountMinor}:${fp}${params.salt ? `:${params.salt}` : ''}`;
}

// Global, survives StrictMode remounts in dev (prevents duplicate first fires)
const FIRED_KEYS: Set<string> =
  typeof window !== 'undefined'
    ? ((window as any).__stripePIKeys ||= new Set<string>())
    : new Set<string>();

// Helper: detect Stripe idempotency-params mismatch
const isIdempotencyParamMismatch = (msg: string | undefined) =>
  !!msg && /idempotent/i.test(msg) && /same parameters/i.test(msg);

export function useStripeClientSecret(input?: {
  totalMajor: number;
  currency: string;
  cart: CartItem[];
  shippingMajor: number;
  taxRatePercent: number;
  discountMajor: number;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safe defaults during first render
  const {
    totalMajor = 0,
    currency = 'ILS',
    cart = [],
    shippingMajor = 0,
    taxRatePercent = 0,
    discountMajor = 0,
  } = input || ({} as any);

  const amountMinor = useMemo(
    () => toMinor(totalMajor, currency),
    [totalMajor, currency],
  );

  const cartPayload = useMemo(
    () =>
      (cart || []).map((i) => ({
        productId: i.productId ?? i.id ?? '',
        name: i.name ?? '',
        price: Number(i.price ?? 0), // MAJOR
        image:
          typeof i.image === 'string'
            ? i.image
            : Array.isArray(i.images) && typeof i.images[0] === 'string'
              ? i.images[0]
              : undefined,
        quantity: Number(i.quantity ?? 0),
      })),
    [cart],
  );

  const cartForKey = useMemo(
    () =>
      cartPayload.map((i) => ({
        productId: i.productId,
        price: i.price,
        quantity: i.quantity,
      })),
    [cartPayload],
  );

  const requestKey = useMemo(
    () =>
      buildIdemKey({
        currency,
        amountMinor,
        shippingMajor,
        taxRatePercent,
        discountMajor,
        cartPayload: cartForKey,
      }),
    [
      currency,
      amountMinor,
      shippingMajor,
      taxRatePercent,
      discountMajor,
      cartForKey,
    ],
  );

  const inflight = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const createIntent = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!amountMinor || amountMinor <= 0) {
        setClientSecret(null);
        setError(null);
        setLoading(false);
        return;
      }

      // Start fresh request
      inflight.current?.abort();
      const ctl = new AbortController();
      inflight.current = ctl;

      const key = opts?.force
        ? buildIdemKey({
            currency,
            amountMinor,
            shippingMajor,
            taxRatePercent,
            discountMajor,
            cartPayload: cartForKey,
            salt: Date.now().toString(36),
          })
        : requestKey;

      const body = {
        totalMajor, // MAJOR
        currency,
        cart: cartPayload, // for server draft display
        shippingMajor,
        taxRatePercent,
        discountMajor,
        idempotencyKey: key,
      };

      setLoading(true);
      try {
        const { data } = await axiosInstance.post(
          '/orders/create-payment-intent',
          body,
          { signal: ctl.signal },
        );

        if (!mounted.current) return;
        const secret = data?.clientSecret;
        if (!secret || typeof secret !== 'string')
          throw new Error('Empty client secret from server');

        setClientSecret(secret);
        setError(null);
      } catch (err: any) {
        if (!mounted.current) return;
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED')
          return;

        // If Stripe says "same parameters" → retry ONCE with a salted key
        const rawMsg =
          (Array.isArray(err?.response?.data?.message)
            ? err.response.data.message.join(', ')
            : err?.response?.data?.message) ||
          err?.message ||
          '';

        if (!opts?.force && isIdempotencyParamMismatch(String(rawMsg))) {
          try {
            const saltedKey = buildIdemKey({
              currency,
              amountMinor,
              shippingMajor,
              taxRatePercent,
              discountMajor,
              cartPayload: cartForKey,
              salt: Date.now().toString(36),
            });

            const { data } = await axiosInstance.post(
              '/orders/create-payment-intent',
              { ...body, idempotencyKey: saltedKey },
              { signal: ctl.signal },
            );

            if (!mounted.current) return;
            const secret = data?.clientSecret;
            if (!secret || typeof secret !== 'string')
              throw new Error('Empty client secret from server');

            setClientSecret(secret);
            setError(null);
            return; // success after retry
          } catch (err2: any) {
            const msg2 =
              (Array.isArray(err2?.response?.data?.message)
                ? err2.response.data.message.join(', ')
                : err2?.response?.data?.message) ||
              err2?.message ||
              'Failed to create payment intent';
            setClientSecret(null);
            setError(String(msg2));
            return;
          }
        }

        // Normal error path
        const msg =
          (Array.isArray(err?.response?.data?.message)
            ? err.response.data.message.join(', ')
            : err?.response?.data?.message) ||
          err?.message ||
          'Failed to create payment intent';
        setClientSecret(null);
        setError(String(msg));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [
      amountMinor,
      requestKey,
      totalMajor,
      currency,
      cartPayload,
      cartForKey,
      shippingMajor,
      taxRatePercent,
      discountMajor,
    ],
  );

  // Fire once per unique requestKey (survives StrictMode remounts)
  useEffect(() => {
    mounted.current = true;

    if (!amountMinor || amountMinor <= 0) {
      setClientSecret(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (FIRED_KEYS.has(requestKey)) return;
    FIRED_KEYS.add(requestKey);
    void createIntent();

    return () => {
      mounted.current = false;
      // do NOT abort here — StrictMode would cancel the real request
    };
  }, [amountMinor, requestKey, createIntent]);

  const refresh = useCallback(async () => {
    // allow a new key to be fired again
    FIRED_KEYS.delete(requestKey);
    await createIntent({ force: true });
  }, [requestKey, createIntent]);

  return { clientSecret, loading, error, refresh };
}

export default useStripeClientSecret;
