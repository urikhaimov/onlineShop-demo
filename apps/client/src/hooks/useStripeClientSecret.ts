// src/hooks/useStripeClientSecret.ts
import { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useCartStore } from '../stores/useCartStore';
import { cLogger } from '@client/logger';

export const useStripeClientSecret = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cart = useCartStore((s) => s.items);

  const shipping = 5.99;
  const taxRate = 0.17;
  const discount = 3.0;
  const total = useCartStore.getState().getCartTotal({
    shipping,
    taxRate,
    discount: discount * 100,
  });

  useEffect(() => {
    const fetchSecret = async () => {
      try {
        const sanitizedCart = cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          image:
            typeof item.imageUrl === 'string'
              ? item.imageUrl
              : (item.imageUrl ?? ''),
        }));

        const safeAmount = Math.max(50, total);
        const res = await api.post('/orders/create-payment-intent', {
          amount: safeAmount,
          cart: sanitizedCart,
          ownerName: 'John Doe',
          passportId: 'AB1234567',
          shipping,
          taxRate,
          discount,
        });

        if (!res.data.clientSecret) throw new Error('Missing clientSecret');
        setClientSecret(res.data.clientSecret);
      } catch (err: any) {
        cLogger.error('[Stripe] Failed to fetch clientSecret:', err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchSecret();
  }, [cart, total]);

  return { clientSecret, loading, error };
};
