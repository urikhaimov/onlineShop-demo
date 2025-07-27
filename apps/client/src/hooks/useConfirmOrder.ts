import { useEffect, useState } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import api from '../api/axiosInstance';
import { cLogger } from '@client/logger';

export function useConfirmOrder() {
  const [loading, setLoading] = useState(true);
  const [toastOpen, setToastOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearCart = useCartStore((s) => s.clearCart);
  const items = useCartStore((s) => s.items);
  const location = useLocation();

  useEffect(() => {
    const confirmAndSaveOrder = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const paymentIntentId = params.get('payment_intent');
        if (!paymentIntentId) throw new Error('Missing payment intent ID');

        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const token = await user.getIdToken();

        // Step 1: Verify payment intent with backend
        const paymentRes = await api.get(
          `/stripe/payment-intent/${paymentIntentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const paymentIntent = paymentRes.data;
        if (!paymentIntent?.id) throw new Error('Payment intent not found');

        // Step 2: Send order to backend (handles stock deduction)
        await api.post(
          '/orders',
          {
            userId: user.uid,
            paymentIntentId: paymentIntent.id,
            totalAmount: paymentIntent.amount,
            items: items.map((item) => ({
              productId: item.id,
              name: item.name,
              price: Number(item.price),
              image: item.imageUrl,
              quantity: item.quantity,
            })),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Step 3: Clear cart (Zustand + optional localStorage)
        clearCart();
        localStorage.removeItem('cart');

        // Step 4: Show success toast
        setToastOpen(true);
      } catch (err: any) {
        cLogger.error('❌ Order save error:', err);
        setError(err.message || 'Error saving order');
      } finally {
        setLoading(false);
      }
    };

    confirmAndSaveOrder().catch((err) => {
      cLogger.error('❌ useConfirmOrder error:', err);
      setError(err.message || 'Error confirming order');
      setLoading(false);
    });
  }, [clearCart, items, location.search]);

  return {
    loading,
    toastOpen,
    setToastOpen,
    error,
  };
}
