// src/hooks/useStripeClientSecret.ts
import { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useCartStore } from '../stores/useCartStore';
import { auth } from '../firebase';

// You can lift these up via props if you want them dynamic:
const DEFAULT_SHIPPING_MAJOR = 5.99; // ₪
const DEFAULT_TAX_RATE = 0.17; // 17%
const DEFAULT_DISCOUNT_MINOR = 300; // ₪3.00 → 300
const MIN_MINOR_ILS = 200; // Stripe min ~ ₪2.00

export function useStripeClientSecret() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);

  // Build the POST body your /orders/create-payment-intent expects
  const buildBody = useCallback(() => {
    // Total in MINOR units using your store’s calculator
    const totalMinor = useCartStore.getState().getCartTotal({
      shipping: DEFAULT_SHIPPING_MAJOR,
      taxRate: DEFAULT_TAX_RATE,
      discount: DEFAULT_DISCOUNT_MINOR,
    });

    // Optional client-side clamp to reduce noisy 400s in dev:
    const amountMinor =
      Math.max(0, Math.round(Number(totalMinor) || 0)) < MIN_MINOR_ILS
        ? MIN_MINOR_ILS
        : Math.max(0, Math.round(Number(totalMinor) || 0));

    const cart = (items || []).map((i) => ({
      productId: String(i.id ?? ''),
      name: String(i.name ?? ''),
      // price in MAJOR units (₪). If your store keeps price as string, coerce:
      price: Number(i.price) || 0,
      image:
        typeof (i as { imageUrl?: string }).imageUrl === 'string'
          ? (i as { imageUrl?: string }).imageUrl
          : (i as { image?: string }).image || '',
      quantity: Number(i.quantity) || 0,
    }));

    return {
      amount: amountMinor, // MINOR units
      ownerName: '', // fill later if you collect it pre-PI
      passportId: '', // same
      cart,
      shipping: DEFAULT_SHIPPING_MAJOR, // MAJOR units
      taxRate: DEFAULT_TAX_RATE, // e.g., 0.17
      discount: DEFAULT_DISCOUNT_MINOR, // MINOR units
      // shippingAddress: { ... }          // optionally pass if you have it now
    };
  }, [items]);

  const createIntent = useCallback(async (): Promise<string> => {
    if (!items || items.length === 0) {
      throw new Error('Cart is empty');
    }

    const user = auth.currentUser;
    const token = await user?.getIdToken?.();

    const body = buildBody();

    // Important: use the ORDERS endpoint (not the old /stripe one)
    const res = await api.post('/orders/create-payment-intent', body, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const secret = res?.data?.clientSecret;
    if (typeof secret !== 'string' || !secret.length) {
      throw new Error('Missing clientSecret');
    }

    return secret;
  }, [items, buildBody]);

  // Expose a refresh() your components can call on demand
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = await createIntent();
      setClientSecret(secret);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to refresh payment intent',
      );
    } finally {
      setLoading(false);
    }
  }, [createIntent]);

  // Create the PI when the hook mounts / cart changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const secret = await createIntent();
        if (!cancelled) setClientSecret(secret);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to create payment intent',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createIntent]);

  return { clientSecret, loading, error, refresh };
}
