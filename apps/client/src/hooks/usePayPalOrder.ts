import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

type CartItem = {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  image?: string;
  images?: string[];
  quantity?: number;
};

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

function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function buildRequestId(params: {
  currency: string;
  amountMinor: number;
  shippingMajor: number;
  taxRatePercent: number;
  discountMajor: number;
  cartPayload: { productId: string; price: number; quantity: number }[];
  salt?: string;
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
  return `pp:${params.currency}:${params.amountMinor}:${fp}${params.salt ? `:${params.salt}` : ''}`;
}

const FIRED_KEYS: Set<string> =
  typeof window !== 'undefined'
    ? ((
        window as Window & { __paypalOrderKeys?: Set<string> }
      ).__paypalOrderKeys ??= new Set())
    : new Set();

export function usePayPalOrder(input?: {
  totalMajor: number;
  currency: string;
  cart: CartItem[];
  shippingMajor: number;
  taxRatePercent: number;
  discountMajor: number;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    totalMajor = 0,
    currency = 'ILS',
    cart = [],
    shippingMajor = 0,
    taxRatePercent = 0,
    discountMajor = 0,
  } = input ?? {};

  const amountMinor = useMemo(
    () => toMinor(totalMajor, currency),
    [totalMajor, currency],
  );

  const cartPayload = useMemo(
    () =>
      cart.map((i) => ({
        productId: i.productId ?? i.id ?? '',
        name: i.name ?? '',
        price: Number(i.price ?? 0),
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
      buildRequestId({
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

  const createOrder = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!amountMinor || amountMinor <= 0) {
        setOrderId(null);
        setError(null);
        setLoading(false);
        return;
      }

      inflight.current?.abort();
      const ctl = new AbortController();
      inflight.current = ctl;

      const nonce = opts?.force ? Date.now().toString(36) : undefined;

      const body = {
        amount: amountMinor,
        currency,
        cart: cartPayload,
        shippingMajor,
        taxRatePercent,
        discountMajor,
        nonce,
      };

      setLoading(true);
      try {
        const { data } = await axiosInstance.post(
          '/orders/create-paypal-order',
          body,
          {
            signal: ctl.signal,
          },
        );

        if (!mounted.current) return;
        const id = data?.orderId;
        if (!id || typeof id !== 'string')
          throw new Error('Empty orderId from server');

        setOrderId(id);
        setError(null);
      } catch (err: unknown) {
        if (!mounted.current) return;
        const axiosErr = err as {
          name?: string;
          code?: string;
          response?: { data?: { message?: unknown } };
          message?: string;
        };
        if (
          axiosErr?.name === 'CanceledError' ||
          axiosErr?.code === 'ERR_CANCELED'
        )
          return;

        const raw = axiosErr?.response?.data?.message;
        const msg =
          (Array.isArray(raw)
            ? raw.join(', ')
            : typeof raw === 'string'
              ? raw
              : undefined) ??
          axiosErr?.message ??
          'Failed to create PayPal order';

        setOrderId(null);
        setError(String(msg));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [
      amountMinor,
      currency,
      cartPayload,
      cartForKey,
      shippingMajor,
      taxRatePercent,
      discountMajor,
    ],
  );

  useEffect(() => {
    mounted.current = true;

    if (!amountMinor || amountMinor <= 0) {
      setOrderId(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (FIRED_KEYS.has(requestKey)) return;
    FIRED_KEYS.add(requestKey);
    void createOrder();

    return () => {
      mounted.current = false;
    };
  }, [amountMinor, requestKey, createOrder]);

  const refresh = useCallback(async () => {
    FIRED_KEYS.delete(requestKey);
    await createOrder({ force: true });
  }, [requestKey, createOrder]);

  return { orderId, loading, error, refresh };
}

export default usePayPalOrder;
