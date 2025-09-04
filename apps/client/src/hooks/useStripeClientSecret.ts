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

// Zero-decimal currency helper (keeps client/server in sync)
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

function toMinor(major: number, currency: string) {
  return ZERO_DEC.has(currency.toUpperCase())
    ? Math.round(Number(major) || 0)
    : Math.round((Number(major) || 0) * 100);
}
function toMajor(minor: number, currency: string) {
  return ZERO_DEC.has(currency.toUpperCase())
    ? Math.round(Number(minor) || 0)
    : (Number(minor) || 0) / 100;
}

export function useStripeClientSecret(input?: {
  totalMajor: number;
  currency: string; // 'ILS', 'USD', ...
  cart: CartItem[];
  shippingMajor: number;
  taxRatePercent: number; // e.g. 17 means 17%
  discountMajor: number;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Defensive defaults so hook is safe during initial render
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

  // Minimal cart payload for metadata/server
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

  const inflight = useRef<AbortController | null>(null);

  const createIntent = useCallback(async () => {
    // Guard: zero cart or zero amount → clear secret
    if (!amountMinor || amountMinor <= 0) {
      setClientSecret(null);
      return;
    }

    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;

    setLoading(true);
    setError(null);
    try {
      // Send BOTH shapes so either controller implementation works:
      // - amount (MINOR) + currency
      // - totalMajor (MAJOR) + currency
      const body = {
        // new/strict backends often validate at least these:
        amount: amountMinor, // MINOR units
        currency, // 'ILS'
        // if server expects the object-style service call:
        totalMajor: toMajor(amountMinor, currency), // MAJOR
        // useful extras:
        cart: cartPayload,
        shipping: Number(shippingMajor),
        taxRate: Number(taxRatePercent) / 100, // fraction (e.g., 0.17)
        discount: toMinor(discountMajor, currency), // MINOR
        idempotencyKey: `pi:${currency}:${amountMinor}:${cartPayload.length}`,
      };

      const { data } = await axiosInstance.post(
        '/orders/create-payment-intent',
        body,
        { signal: ctl.signal },
      );

      const secret = data?.clientSecret;
      if (!secret || typeof secret !== 'string') {
        throw new Error('Empty client secret from server');
      }
      setClientSecret(secret);
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return; // superseded by a newer request
      }
      const serverMsg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err?.response?.data?.message;
      const msg =
        serverMsg || err?.message || 'Failed to create payment intent';
      setError(String(msg));
      setClientSecret(null);
    } finally {
      setLoading(false);
    }
  }, [
    amountMinor,
    currency,
    cartPayload,
    shippingMajor,
    taxRatePercent,
    discountMajor,
  ]);

  // Auto-create on mount and whenever inputs change
  useEffect(() => {
    createIntent();
    return () => inflight.current?.abort();
  }, [createIntent]);

  const refresh = useCallback(async () => {
    await createIntent();
  }, [createIntent]);

  return { clientSecret, loading, error, refresh };
}

export default useStripeClientSecret;
