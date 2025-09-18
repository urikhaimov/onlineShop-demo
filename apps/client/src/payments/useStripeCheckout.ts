// src/payments/useStripeCheckout.ts
import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  useStripe,
  useElements,
  CardElement,
  PaymentElement,
} from '@stripe/react-stripe-js';

export type CreatePIBody = {
  cartId: string;
  amount: number; // in minor units (e.g., ILS agorot)
  currency: 'ils' | 'usd'; // etc.
  customerEmail?: string;
};

export function useStripeClientSecret(payload: CreatePIBody | null) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // single-flight guard so re-renders don’t refetch
  const inflight = useRef(false);

  useEffect(() => {
    if (!payload || inflight.current) return;
    inflight.current = true;
    setError(null);
    setLoading(true);

    // ✅ stable idempotency key for this cart + amount
    const idempotencyKey = `${payload.cartId}:${payload.amount}:${payload.currency}`;

    // cancel any previous run
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    fetch('/api/payments/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setClientSecret(json.clientSecret))
      .catch((e) => {
        if (e.name !== 'AbortError')
          setError(e.message || 'Failed to create PaymentIntent');
      })
      .finally(() => {
        setLoading(false);
        inflight.current = false;
      });

    return () => ac.abort();
  }, [payload]);

  return { clientSecret, loading, error };
}

// ---- Use in your checkout button ----
export function useConfirmCardPayment() {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(clientSecret: string) {
    if (!stripe || !elements) {
      setError('Stripe is not ready. Please try again.');
      return { ok: false };
    }
    setProcessing(true);
    setError(null);
    try {
      // If you use PaymentElement:
      // const { error: seError } = await stripe.confirmPayment({
      //   elements,
      //   clientSecret,
      //   confirmParams: { return_url: window.location.origin + '/checkout/success' },
      //   redirect: 'if_required',
      // });

      // If you use CardElement:
      const card = elements.getElement(CardElement);
      const { error: seError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: { card: card! },
        },
      );

      if (seError) {
        setError(
          `${seError.message ?? 'Payment failed'}${seError.code ? ` [${seError.code}]` : ''}`,
        );
        return { ok: false };
      }

      // Optional: handle processing state
      if (paymentIntent && paymentIntent.status === 'processing') {
        return { ok: true, processing: true };
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        return { ok: true };
      }

      setError(`Unexpected status: ${paymentIntent?.status ?? 'unknown'}`);
      return { ok: false };
    } catch (e: any) {
      setError(e?.message || 'Payment confirmation failed');
      return { ok: false };
    } finally {
      setProcessing(false);
    }
  }

  return { confirm, processing, error, setError };
}
