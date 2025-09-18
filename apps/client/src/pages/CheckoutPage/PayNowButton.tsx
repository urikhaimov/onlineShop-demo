// src/pages/Checkout/PayNowButton.tsx
import { Button, Alert } from '@mui/material';
import { CardElement } from '@stripe/react-stripe-js';
import {
  useStripeClientSecret,
  useConfirmCardPayment,
} from '../../payments/useStripeCheckout';

export function PayNowSection({
  cartId,
  totalCents,
  currency,
  email,
}: {
  cartId: string;
  totalCents: number;
  currency: 'ils' | 'usd';
  email?: string;
}) {
  const {
    clientSecret,
    loading,
    error: piError,
  } = useStripeClientSecret(
    totalCents > 0
      ? { cartId, amount: totalCents, currency, customerEmail: email }
      : null,
  );
  const {
    confirm,
    processing,
    error: payError,
    setError,
  } = useConfirmCardPayment();

  return (
    <>
      <CardElement options={{ hidePostalCode: true }} />
      {(piError || payError) && (
        <Alert sx={{ mt: 2 }} severity="error" onClose={() => setError(null)}>
          {piError || payError}
        </Alert>
      )}
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!clientSecret || loading || processing}
        onClick={async () => {
          if (!clientSecret) return;
          const res = await confirm(clientSecret);
          if (res.ok) {
            // show success UI / navigate
            // e.g., navigate('/checkout/success')
          }
        }}
      >
        {processing ? 'Processing…' : 'Pay Now'}
      </Button>
    </>
  );
}
