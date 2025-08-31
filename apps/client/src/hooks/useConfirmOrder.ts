import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useCartStore } from '../stores/useCartStore';

type ConfirmResponse = { orderId: string; alreadyConfirmed?: boolean };

function extractPaymentIntentId(search: string): string | null {
  const qs = new URLSearchParams(search);
  const pi = qs.get('payment_intent');
  if (pi) return pi;
  const secret = qs.get('payment_intent_client_secret');
  return secret ? secret.split('_secret')[0] : null;
}

/**
 * Idempotent order confirmation:
 * - Confirms by payment_intent from the URL (preferred).
 * - Does NOT throw if the cart is empty.
 * - Uses localStorage to avoid double-confirm on refresh.
 * - Clears the cart only if it still has items.
 */
export function useConfirmOrder() {
  const { search } = useLocation();

  const paymentIntentId = useMemo(
    () => extractPaymentIntentId(search),
    [search],
  );

  const items = useCartStore((s) => s.items ?? []);
  const clearCart = useCartStore((s) => s.clearCart);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // If we don't have a PI, just render the success page without doing anything noisy.
        if (!paymentIntentId) {
          setError(null);
          return;
        }

        // Skip if we already confirmed this PI in this browser.
        const doneKey = `pi:${paymentIntentId}:confirmed`;
        if (localStorage.getItem(doneKey) === '1') {
          return;
        }

        // Prefer server-side confirm using PaymentIntent (cart snapshot optional).
        const payload: any = { paymentIntentId };
        if (items.length > 0) payload.cart = { items };

        const { data } = await axiosInstance.post<ConfirmResponse>(
          '/orders/confirm',
          payload,
        );

        // Clear cart only if it still has items (no error if already empty).
        if (items.length > 0) clearCart();

        localStorage.setItem(doneKey, '1');
        if (!cancelled) setToastOpen(true);
      } catch (e: any) {
        // Treat "Cart is empty" as non-fatal; Success page should not depend on cart.
        const msg =
          e?.response?.data?.message || e?.message || 'Failed to confirm order';

        if (String(msg).toLowerCase().includes('cart is empty')) {
          if (!cancelled) setError(null);
        } else {
          if (!cancelled) setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId, items, clearCart]);

  return { loading, error, toastOpen, setToastOpen };
}

export default useConfirmOrder;
