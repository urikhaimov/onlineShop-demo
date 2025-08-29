// src/hooks/useStripeClientSecret.ts  (ADD refresh() and export it)
import { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useCartStore } from '../stores/useCartStore';
import { auth } from '../firebase';

export function useStripeClientSecret() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);

  const createIntent = useCallback(async () => {
    const user = auth.currentUser;
    const token = await user?.getIdToken?.();
    // Build whatever body your backend expects (amount, items etc.)
    const body = { items: items.map((i) => ({ id: i.id, qty: i.quantity })) };
    const res = await api.post('/stripe/payment-intent', body, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.data?.clientSecret) throw new Error('Missing clientSecret');
    return res.data.clientSecret as string;
  }, [items]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const secret = await createIntent();
        if (!cancelled) setClientSecret(secret);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : 'Failed to create payment intent',
          );
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
