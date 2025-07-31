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
  const location = useLocation();

  const clearCart = useCartStore((s) => s.clearCart);
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    const confirmAndSaveOrder = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const paymentIntentId = params.get('payment_intent');
        if (!paymentIntentId) throw new Error('Missing payment intent ID');

        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const token = await user.getIdToken();
        if (!items || items.length === 0) throw new Error('Cart is empty');

        console.log('🛒 Submitting order with items:', items);

        const paymentRes = await api.get(
          `/stripe/payment-intent/${paymentIntentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const paymentIntent = paymentRes.data;
        if (!paymentIntent?.id) throw new Error('Payment intent not found');

        const payload = {
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
        };

        const orderRes = await api.post('/orders', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        debugger;
        if (!orderRes.data?.id) throw new Error('Order creation failed');

        alert('🧹 About to clear cart after order success');
        console.log('✅ About to call clearCart()...');
        clearCart();
        console.log('✅ Called clearCart()');
        localStorage.removeItem('cart');
        console.log('✅ Removed localStorage.cart');

        setToastOpen(true);
      } catch (err: any) {
        cLogger.error('❌ useConfirmOrder error:', err);
        setError(err.message || 'Error confirming order');
      } finally {
        setLoading(false);
      }
    };

    console.log('🚀 useConfirmOrder initialized');
    confirmAndSaveOrder();

    return () => {
      console.log('👋 useConfirmOrder unmounted');
    };
  }, [location.search, clearCart, items]);

  return {
    loading,
    toastOpen,
    setToastOpen,
    error,
  };
}
