import { useEffect, useState } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import api from '../api/axiosInstance';

type OrderDraft = {
  items?: Array<{
    id?: string;
    productId?: string;
    name: string;
    quantity: number;
    price: number; // major
    image?: string;
    imageUrl?: string;
    images?: string[];
  }>;
  pricing?: { totalCents?: number };
  payer?: { ownerName?: string; passportId?: string };
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  payment?: { transactionId?: string; status?: string; method?: string };
  notes?: string;
};

export function useConfirmOrder() {
  const [loading, setLoading] = useState(true);
  const [toastOpen, setToastOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const clearCart = useCartStore((s) => s.clearCart);
  const cartItems = useCartStore((s) => s.items);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const paymentIntentId = params.get('payment_intent') ?? undefined;

        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const token = await user.getIdToken();

        const raw = localStorage.getItem('orderDraft');
        const draft: OrderDraft | null = raw ? JSON.parse(raw) : null;

        // amount (minor)
        let amount = draft?.pricing?.totalCents;
        if (!amount) {
          amount = Math.round(
            cartItems.reduce(
              (s, it) => s + Number(it.price || 0) * (it.quantity ?? 0),
              0,
            ) * 100,
          );
        }

        // items
        const baseItems = draft?.items?.length ? draft.items! : cartItems;
        if (!baseItems || !baseItems.length) throw new Error('Cart is empty');

        const items = baseItems.map((it, idx) => {
          const img =
            it.image ??
            it.imageUrl ??
            (Array.isArray(it.images) && it.images.length ? it.images[0] : '');
          return {
            productId: it.productId ?? it.id ?? `unknown-${idx}`,
            name: it.name,
            quantity: it.quantity,
            price: Number(it.price), // major
            image: img || undefined,
          };
        });

        const paid =
          draft?.payment?.status === 'succeeded' || Boolean(paymentIntentId);

        const payload = {
          userId: user.uid,
          email: user.email ?? undefined,
          totalAmount: amount, // minor
          items,
          status: paid ? ('confirmed' as const) : ('pending' as const),
          paymentIntentId,
          payment: {
            method: draft?.payment?.method ?? 'card',
            status: paid ? ('paid' as const) : ('unpaid' as const),
            transactionId: draft?.payment?.transactionId ?? paymentIntentId,
          },
          ownerName: draft?.payer?.ownerName,
          passportId: draft?.payer?.passportId,
          shippingAddress: draft?.shippingAddress,
          notes: draft?.notes,
        };

        // Primary path: create the order document directly
        const orderRes = await api.post('/orders', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fallback: if backend asks you to finalize via PI id (e.g. using webhook-only mode)
        if (!orderRes.data?.id && paymentIntentId) {
          await api.post(
            `/orders/create-from-intent/${paymentIntentId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }

        clearCart();
        localStorage.removeItem('cart');
        localStorage.removeItem('orderDraft');
        if (!cancelled) setToastOpen(true);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ??
          (e as Error)?.message ??
          'Error confirming order';
        if (!cancelled)
          setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        console.error('useConfirmOrder error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [location.search, clearCart, cartItems]);

  return { loading, toastOpen, setToastOpen, error };
}
