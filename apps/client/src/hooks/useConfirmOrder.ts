// src/hooks/useConfirmOrder.ts
import { useEffect, useState } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import api from '../api/axiosInstance';
import { Timestamp } from 'firebase/firestore';

type OrderDraft = {
  items: Array<{
    id?: string;
    productId?: string;
    name: string;
    quantity: number;
    price: number;
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

        // Prefer the orderDraft saved by the checkout form (contains shipping & payer)
        const raw = localStorage.getItem('orderDraft');
        const draft: OrderDraft | null = raw ? JSON.parse(raw) : null;

        // Amount (cents)
        let amount = draft?.pricing?.totalCents;
        if (!amount && paymentIntentId) {
          const res = await api.get(
            `/stripe/payment-intent/${paymentIntentId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          amount = res.data?.amount;
        }
        if (!amount) {
          // fallback from cart
          amount = Math.round(
            cartItems.reduce(
              (s, it) => s + Number(it.price || 0) * (it.quantity ?? 0),
              0,
            ) * 100,
          );
        }

        // Items
        const baseItems = draft?.items?.length ? draft.items : cartItems;
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
            price: Number(it.price),
            image: img,
          };
        });

        const paid =
          draft?.payment?.status === 'succeeded' || Boolean(paymentIntentId);

        // Required metadata (server will override timestamps again for integrity)
        const now = Timestamp.now();
        const name = user.displayName?.trim() || user.email || 'User';
        const metadata = {
          createdBy: {
            uid: Math.abs(
              [...user.uid].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
            ),
            name,
          },
          updatedBy: {
            uid: Math.abs(
              [...user.uid].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
            ),
            name,
          },
          createdAt: now,
          updatedAt: now,
        };

        // ✅ Full payload including owner/passport/shipping
        const payload = {
          userId: user.uid,
          email: user.email ?? undefined,
          totalAmount: amount,
          items,
          status: paid ? 'paid' : 'pending',
          paymentIntentId,
          payment: {
            method: draft?.payment?.method ?? 'card',
            status: paid ? 'paid' : 'unpaid',
            transactionId: draft?.payment?.transactionId ?? paymentIntentId,
          },
          ownerName: draft?.payer?.ownerName,
          passportId: draft?.payer?.passportId,
          shippingAddress: draft?.shippingAddress, // <<<<<<<<<<<<<<<<<
          notes: draft?.notes,
          metadata, // <<<<<<<<<<<<<<<<<
        };

        const orderRes = await api.post('/orders', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!orderRes.data?.id) throw new Error('Order creation failed');

        clearCart();
        localStorage.removeItem('cart');
        localStorage.removeItem('orderDraft');
        if (!cancelled) setToastOpen(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error confirming order';
        if (!cancelled) setError(msg);
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
