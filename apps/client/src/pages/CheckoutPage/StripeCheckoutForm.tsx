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
  LinkAuthenticationElement,
} from '@stripe/react-stripe-js';
import type {
  StripePaymentElementOptions,
  StripeLinkAuthenticationElementChangeEvent,
} from '@stripe/stripe-js';

import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import FormTextField from '../../components/FormTextField';
import { useCartStore } from '../../stores/useCartStore';
import { useStripeCheckoutStore } from '../../stores/useStripeCheckoutStore';
import axiosInstance from '../../api/axiosInstance';
import { auth } from '../../firebase';

type ShippingAddress = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
};

type FormData = {
  ownerName: string;
  passportId: string;
  shippingAddress: ShippingAddress;
};

function toIso2Country(input: string): string {
  const s = (input || '').trim().toUpperCase();
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

function prettyStripeError(code?: string, fallback?: string) {
  switch (code) {
    case 'card_declined':
      return 'Your card was declined. Try another card.';
    case 'insufficient_funds':
      return 'Insufficient funds on this card.';
    case 'expired_card':
      return 'This card is expired.';
    case 'incorrect_cvc':
      return 'Incorrect CVC.';
    case 'processing_error':
      return 'Payment processor error. Please try again.';
    case 'amount_too_small':
      return 'Amount is too small to charge.';
    default:
      return fallback || 'Payment failed. Please try again.';
  }
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
  const isProd = import.meta.env.PROD;

  // Dev-only: silence Apple/Google Pay warnings on localhost
  const paymentElementOptions: StripePaymentElementOptions = isProd
    ? {}
    : {
        wallets: { applePay: 'never' },
        paymentMethodOrder: ['card'],
      };

  const [email, setEmail] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

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

  // ✅ Poll PUBLIC endpoint until webhook has created the order
  // Endpoint returns: { state: 'processing'|'succeeded'|..., orderId?: string }
  async function waitForOrderPaid(piId: string, timeoutMs = 60_000) {
    const start = Date.now();
    let delay = 1200;

    while (Date.now() - start < timeoutMs) {
      try {
        const { data } = await axiosInstance.get<{
          state: string;
          orderId?: string;
        }>(`/orders/public/${piId}`);

        if (
          data?.state === 'canceled' ||
          data?.state === 'requires_payment_method'
        ) {
          throw new Error(`Payment ${data.state}`);
        }

        if (data?.state === 'succeeded' && data?.orderId) {
          return data.orderId as string;
        }
      } catch {
        // Ignore transient 404/5xx while webhook not finished
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 400, 4000);
    }
    return null;
  }

  const onSubmit = async (data: FormData) => {
    if (!stripe || !elements) {
      setError(
        t('checkoutForm.errors.stripeNotReady', {
          defaultValue: 'Stripe is not ready yet',
        }),
      );
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const addr = data.shippingAddress;
      const countryIso2 = toIso2Country(addr.country);
      const fallbackEmail = auth.currentUser?.email || undefined;
      const billingEmail = (email || '').trim() || fallbackEmail;

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: data.ownerName || addr.fullName,
                email: billingEmail,
                phone: addr.phone,
                address: {
                  line1: addr.street,
                  city: addr.city,
                  postal_code: addr.postalCode,
                  country: countryIso2,
                },
              },
            },
            shipping: {
              name: addr.fullName || data.ownerName,
              phone: addr.phone,
              address: {
                line1: addr.street,
                city: addr.city,
                postal_code: addr.postalCode,
                country: countryIso2,
              },
            },
            receipt_email: billingEmail,
            return_url: `${window.location.origin}/checkout/success`,
          },
          redirect: 'if_required',
        },
      );

      if (stripeError) {
        const msg = prettyStripeError(
          (stripeError as any)?.code,
          stripeError.message ||
            t('checkoutForm.errors.paymentFailed', {
              defaultValue: 'Payment failed',
            }),
        );
        setError(msg);
        setLoading(false);
        setSubmitting(false);
        if (onRefreshIntent) await onRefreshIntent();
        return;
      }

      const piId = paymentIntent?.id;
      const piStatus = paymentIntent?.status;

      if (
        piId &&
        (piStatus === 'succeeded' ||
          piStatus === 'processing' ||
          piStatus === 'requires_action')
      ) {
        const orderId = await waitForOrderPaid(piId);

        if (orderId) {
          try {
            clearCart();
            localStorage.removeItem('cart');
          } catch {
            // no-op
          }
          setLoading(false);
          setSubmitting(false);
          navigate('/checkout/success');
          return;
        }

        // Still processing after timeout → soft message
        setError(
          t('checkoutForm.errors.processing', {
            defaultValue:
              "We are still processing your payment. You'll see your order as soon as it's confirmed.",
          }),
        );
        setLoading(false);
        setSubmitting(false);
        return;
      }

      setError(
        t('checkoutForm.errors.paymentStatus', {
          status: piStatus ?? 'unknown',
          defaultValue: 'Payment status: {{status}}',
        }),
      );
      setLoading(false);
      setSubmitting(false);
      if (onRefreshIntent) await onRefreshIntent();
    } catch (err: any) {
      const msg =
        err?.message ||
        t('checkoutForm.errors.unexpected', {
          defaultValue: 'Unexpected error',
        });
      setError(String(msg));
      setLoading(false);
      setSubmitting(false);
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

      <LinkAuthenticationElement
        onChange={(event: StripeLinkAuthenticationElementChangeEvent) =>
          setEmail(event.value?.email ?? '')
        }
      />

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

      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <PaymentElement options={paymentElementOptions} />
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!stripe || !elements || loading || submitting}
        sx={{ mt: 2 }}
      >
        {loading || submitting ? (
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
