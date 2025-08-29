// src/pages/checkout/StripeCheckoutForm.tsx
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

type ShippingAddress = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string; // user-friendly input (can be "Israel")
};

type FormData = {
  ownerName: string;
  passportId: string;
  shippingAddress: ShippingAddress;
};

function toIso2Country(input: string): string {
  const s = input.trim().toUpperCase();
  if (s.length === 2) return s;
  const map: Record<string, string> = {
    ISRAEL: 'IL',
    'UNITED STATES': 'US',
    USA: 'US',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    RUSSIA: 'RU',
    RUSSIAN: 'RU',
    FRANCE: 'FR',
    GERMANY: 'DE',
    CANADA: 'CA',
    AUSTRALIA: 'AU',
  };
  return map[s] ?? s.slice(0, 2);
}

export default function StripeCheckoutForm({
  onRefreshIntent,
}: {
  onRefreshIntent?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      ownerName: '',
      passportId: '',
      shippingAddress: {
        fullName: '',
        phone: '',
        street: '',
        city: '',
        postalCode: '',
        country: '',
      },
    },
  });

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
      const addr = data.shippingAddress;
      const countryIso2 = toIso2Country(addr.country);

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: data.ownerName || addr.fullName,
                phone: addr.phone,
                address: {
                  line1: addr.street,
                  city: addr.city,
                  postal_code: addr.postalCode,
                  country: countryIso2, // ✅ ISO-2 required
                },
              },
            },
          },
          redirect: 'if_required',
        },
      );

      setLoading(false);

      if (stripeError) {
        // Typical decline / last_payment_error scenario
        setError(
          stripeError.message ||
            t('checkoutForm.errors.paymentFailed', {
              defaultValue: 'Payment failed',
            }),
        );
        // 🔁 create a fresh PaymentIntent so the Payment Element resets
        if (onRefreshIntent) await onRefreshIntent();
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        clearCart();
        localStorage.removeItem('cart');
        navigate('/checkout/success');
      } else if (paymentIntent?.status === 'requires_payment_method') {
        // Card failed or needs a new method — refresh to give a clean slate
        setError(
          t('checkoutForm.errors.paymentStatus', {
            status: paymentIntent.status,
            defaultValue: 'Payment status: {{status}}',
          }),
        );
        if (onRefreshIntent) await onRefreshIntent();
      } else {
        setError(
          t('checkoutForm.errors.paymentStatus', {
            status: paymentIntent?.status ?? 'unknown',
            defaultValue: 'Payment status: {{status}}',
          }),
        );
      }
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Unexpected error';
      setError(
        t('checkoutForm.errors.unexpected', {
          defaultValue: msg,
        }),
      );
      // As a safety, refresh the intent too
      if (onRefreshIntent) await onRefreshIntent();
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

      {/* owner + passport */}
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

      {/* shipping address */}
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        {t('checkoutForm.shippingAddress', {
          defaultValue: 'Shipping Address',
        })}
      </Typography>
      <FormTextField
        label={t('checkoutForm.fullName', { defaultValue: 'Full Name' })}
        register={register('shippingAddress.fullName', {
          required: t('checkoutForm.fullNameRequired', {
            defaultValue: 'Full name is required',
          }) as string,
        })}
        errorObject={errors.shippingAddress?.fullName}
      />
      <FormTextField
        label={t('checkoutForm.phone', { defaultValue: 'Phone' })}
        register={register('shippingAddress.phone', {
          required: t('checkoutForm.phoneRequired', {
            defaultValue: 'Phone is required',
          }) as string,
          minLength: { value: 6, message: 'Too short' },
        })}
        errorObject={errors.shippingAddress?.phone}
      />
      <FormTextField
        label={t('checkoutForm.street', { defaultValue: 'Street' })}
        register={register('shippingAddress.street', {
          required: t('checkoutForm.streetRequired', {
            defaultValue: 'Street is required',
          }) as string,
        })}
        errorObject={errors.shippingAddress?.street}
      />
      <FormTextField
        label={t('checkoutForm.city', { defaultValue: 'City' })}
        register={register('shippingAddress.city', {
          required: t('checkoutForm.cityRequired', {
            defaultValue: 'City is required',
          }) as string,
        })}
        errorObject={errors.shippingAddress?.city}
      />
      <FormTextField
        label={t('checkoutForm.postalCode', { defaultValue: 'Postal Code' })}
        register={register('shippingAddress.postalCode', {
          required: t('checkoutForm.postalCodeRequired', {
            defaultValue: 'Postal code is required',
          }) as string,
        })}
        errorObject={errors.shippingAddress?.postalCode}
      />
      <FormTextField
        label={t('checkoutForm.country', { defaultValue: 'Country' })}
        register={register('shippingAddress.country', {
          required: t('checkoutForm.countryRequired', {
            defaultValue: 'Country is required',
          }) as string,
        })}
        errorObject={errors.shippingAddress?.country}
        helperText={t('checkoutForm.countryHint', {
          defaultValue: 'Use ISO code when possible (e.g., IL, US)',
        })}
      />

      {/* Payment Element */}
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
