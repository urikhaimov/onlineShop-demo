import * as React from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function getPiFromQuery(search: string) {
  const qs = new URLSearchParams(search);
  // Accept any of these, just in case
  return (
    qs.get('payment_intent') ||
    qs.get('paymentIntentId') ||
    qs.get('pi') ||
    ''
  ).trim();
}

function isValidPi(id: string) {
  return /^pi_[A-Za-z0-9]+$/.test(id);
}

export function useConfirmOrder() {
  const { search } = useLocation();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toastOpen, setToastOpen] = React.useState(false);

  React.useEffect(() => {
    const pi = getPiFromQuery(search);
    if (!pi) return; // nothing to confirm if you visit the page directly
    if (!isValidPi(pi)) {
      setError('Invalid payment intent id');
      setToastOpen(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await axiosInstance.post('/orders/confirm', { paymentIntentId: pi });
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || 'Failed to confirm order';
        if (!cancelled) {
          setError(String(msg));
          setToastOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [search]);

  return { loading, error, setToastOpen, setError };
}
