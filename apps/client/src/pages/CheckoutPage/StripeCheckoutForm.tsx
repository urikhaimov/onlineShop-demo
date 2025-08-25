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
import { useTranslation } from 'react-i18next';

type FormData = {
  ownerName: string;
  passportId: string;
};

export default function StripeCheckoutForm() {
  const { t } = useTranslation();
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
      setError(
        t('checkoutForm.errors.stripeNotReady', {
          defaultValue: 'Stripe is not ready yet',
        }),
      );
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
        setError(
          stripeError.message ||
            t('checkoutForm.errors.paymentFailed', {
              defaultValue: 'Payment failed',
            }),
        );
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        clearCart();
        localStorage.removeItem('cart');
        navigate('/checkout/success');
      } else {
        console.warn('PaymentIntent status:', paymentIntent?.status);
        setError(
          t('checkoutForm.errors.paymentStatus', {
            status: paymentIntent?.status ?? 'unknown',
            defaultValue: 'Payment status: {{status}}',
          }),
        );
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Unexpected error confirming payment:', err);
      setError(
        err?.message ||
          t('checkoutForm.errors.unexpected', {
            defaultValue: 'Unexpected error',
          }),
      );
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {t('checkoutForm.paymentDetails', { defaultValue: 'Payment Details' })}
      </Typography>

      <FormTextField
        label={t('checkoutForm.ownerName', { defaultValue: 'Owner Name' })}
        register={register('ownerName', {
          required: t('checkoutForm.ownerNameRequired', {
            defaultValue: 'Owner name is required',
          }) as string,
        })}
        errorObject={errors.ownerName}
      />

      <FormTextField
        label={t('checkoutForm.passportId', { defaultValue: 'Passport ID' })}
        register={register('passportId', {
          required: t('checkoutForm.passportIdRequired', {
            defaultValue: 'Passport ID is required',
          }) as string,
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
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          t('checkoutForm.payNow', { defaultValue: 'Pay Now' })
        )}
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
