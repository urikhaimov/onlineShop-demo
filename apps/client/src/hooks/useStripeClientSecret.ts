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

// Zero-decimal currencies
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

const toMajor = (minor: number, currency: string) =>
  ZERO_DEC.has(currency.toUpperCase())
    ? Math.round(Number(minor) || 0)
    : (Number(minor) || 0) / 100;

// Tiny stable hash (djb2) over a string
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36); // unsigned 32-bit → base36
}

// Build a key that changes whenever any money-meaningful field changes
function buildIdemKey(params: {
  currency: string;
  amountMinor: number;
  shippingMajor: number;
  taxRatePercent: number;
  discountMajor: number;
  cartPayload: { productId: string; price: number; quantity: number }[];
  salt?: string; // used only for one-time retry fallback
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
  const fingerprint = hashStr(JSON.stringify(basis));
  return `pi:${params.currency}:${params.amountMinor}:${fingerprint}${
    params.salt ? `:${params.salt}` : ''
  }`;
}

export function useStripeClientSecret(
  input?: {
    totalMajor: number;
    currency: string; // 'ILS', 'USD', ...
    cart: CartItem[];
    shippingMajor: number; // MAJOR
    taxRatePercent: number; // e.g., 17
    discountMajor: number; // MAJOR
  },
  opts?: { enabled?: boolean },
) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = opts?.enabled ?? true;

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

  // Minimal cart payload (kept for draft display on server)
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

  // Subset used for hashing (ids/prices/qtys only)
  const cartForKey = useMemo(
    () =>
      cartPayload.map((i) => ({
        productId: i.productId,
        price: i.price,
        quantity: i.quantity,
      })),
    [cartPayload],
  );

  // Abort & sequencing to ignore stale responses
  const inflight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const seq = useRef(0);

  const createIntent = useCallback(async () => {
    // Gate by enabled flag
    if (!enabled) return;

    // No amount → clear and bail
    if (!amountMinor || amountMinor <= 0) {
      inflight.current?.abort();
      setClientSecret(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cancel previous and start fresh
    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;
    const mySeq = ++seq.current;

    setLoading(true);

    // Stable idempotency key based on *all* money inputs
    const baseKey = buildIdemKey({
      currency,
      amountMinor,
      shippingMajor,
      taxRatePercent,
      discountMajor,
      cartPayload: cartForKey,
    });

    async function requestOnce(idemKey: string) {
      // ⚠️ Send the shape your controller expects:
      // amount (MINOR), shipping (MAJOR), taxRate (fraction), discount (MINOR)
      const body = {
        amount: amountMinor, // MINOR
        currency,
        cart: cartPayload,
        shipping: Number(shippingMajor),
        taxRate: Number(taxRatePercent) / 100,
        discount: toMinor(discountMajor, currency),
        idempotencyKey: idemKey,
      };

      return axiosInstance.post('/orders/create-payment-intent', body, {
        signal: ctl.signal,
      });
    }

    let retried = false;

    try {
      const { data } = await requestOnce(baseKey);

      // Ignore if a newer request finished
      if (!mounted.current || mySeq !== seq.current) return;

      const secret = data?.clientSecret;
      if (!secret || typeof secret !== 'string') {
        throw new Error('Empty client secret from server');
      }
      setClientSecret(secret);
      setError(null);
    } catch (err: any) {
      const message =
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err?.response?.data?.message) ||
        err?.message ||
        '';

      const looksLikeIdemError =
        typeof message === 'string' &&
        message.toLowerCase().includes('idempotent');

      // One-time retry with a salted key if Stripe rejects the base key
      if (
        !retried &&
        looksLikeIdemError &&
        mounted.current &&
        mySeq === seq.current
      ) {
        retried = true;
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
          const { data } = await requestOnce(saltedKey);
          if (!mounted.current || mySeq !== seq.current) return;

          const secret = data?.clientSecret;
          if (!secret || typeof secret !== 'string') {
            throw new Error('Empty client secret from server (retry)');
          }
          setClientSecret(secret);
          setError(null);
        } catch (err2: any) {
          if (
            err2?.name === 'CanceledError' ||
            err2?.code === 'ERR_CANCELED' ||
            ctl.signal.aborted ||
            mySeq !== seq.current ||
            !mounted.current
          ) {
            return;
          }
          setClientSecret(null);
          setError(
            String(
              (Array.isArray(err2?.response?.data?.message)
                ? err2.response.data.message.join(', ')
                : err2?.response?.data?.message) ||
                err2?.message ||
                'Failed to create payment intent',
            ),
          );
        }
      } else {
        // Normal error flow
        if (
          err?.name === 'CanceledError' ||
          err?.code === 'ERR_CANCELED' ||
          ctl.signal.aborted ||
          mySeq !== seq.current ||
          !mounted.current
        ) {
          return;
        }
        setClientSecret(null);
        setError(String(message || 'Failed to create payment intent'));
      }
    } finally {
      if (mounted.current && mySeq === seq.current) setLoading(false);
    }
  }, [
    enabled,
    amountMinor,
    currency,
    cartPayload,
    cartForKey,
    shippingMajor,
    taxRatePercent,
    discountMajor,
  ]);

  useEffect(() => {
    mounted.current = true;
    if (enabled) createIntent();
    return () => {
      mounted.current = false;
      inflight.current?.abort();
    };
  }, [createIntent, enabled]);

  const refresh = useCallback(async () => {
    if (enabled) await createIntent();
  }, [createIntent, enabled]);

  return { clientSecret, loading, error, refresh };
}

export default useStripeClientSecret;
