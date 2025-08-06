// src/components/StripeCheckoutForm.tsx
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import FormTextField from '../../components/FormTextField';
import { useCartStore } from '../../stores/useCartStore';
import { useStripeCheckoutStore } from '../../stores/useStripeCheckoutStore';

type FormData = {
  ownerName: string;
  passportId: string;
};

export default function StripeCheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const clearCart = useCartStore((s) => s.clearCart);

  const { loading, error, setError, setLoading } = useStripeCheckoutStore();

  const onSubmit = async (data: FormData) => {
    if (!stripe || !elements) {
      setError('Stripe is not ready yet');
      return;
    }

    setLoading(true);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: data.ownerName,
              },
            },
          },
          redirect: 'if_required',
        },
      );

      setLoading(false);

      if (stripeError) {
        console.error('❌ Payment failed:', stripeError);
        setError(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        clearCart();
        localStorage.removeItem('cart');
        navigate('/checkout/success');
      } else {
        console.warn('PaymentIntent status:', paymentIntent?.status);
        setError(`Payment status: ${paymentIntent?.status}`);
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Unexpected error confirming payment:', err);
      setError(err.message || 'Unexpected error');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Payment Details
      </Typography>

      <FormTextField
        label="Owner Name"
        register={register('ownerName', {
          required: 'Owner name is required',
        })}
        errorObject={errors.ownerName}
      />

      <FormTextField
        label="Passport ID"
        register={register('passportId', {
          required: 'Passport ID is required',
        })}
        errorObject={errors.passportId}
      />

      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <PaymentElement />
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!stripe || loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Pay Now'}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
