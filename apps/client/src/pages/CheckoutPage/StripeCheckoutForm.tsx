import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
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
import { useSnackbar } from 'notistack';

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type StripeCheckoutFormProps = {
  /** Optional: if you already know it; otherwise it’s derived from Elements */
  paymentIntentId?: string;
  /** Optional, for analytics/UI only */
  totalMajor?: number;
  /** Optional, for analytics/UI only */
  currency?: string;

  /** Called when the order is fully paid (after webhook/confirm) */
  onPaid?: () => void;
  /** Called on user-visible errors */
  onError?: (msg: string) => void;

  /** Refresh the intent (re-create client secret) */
  onRefreshIntent?: () => Promise<void>;
};

export default function StripeCheckoutForm({
  paymentIntentId: paymentIntentIdProp,
  totalMajor,
  currency,
  onPaid,
  onError,
  onRefreshIntent,
}: StripeCheckoutFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const isProd = import.meta.env.PROD;
  const { enqueueSnackbar } = useSnackbar();

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

  // Toast any errors via notistack (and clear the store error)
  React.useEffect(() => {
    if (error) {
      onError?.(String(error));
      if (!onError) {
        enqueueSnackbar(String(error), {
          variant: 'error',
          autoHideDuration: 5000,
        });
      }
      setError(null);
    }
  }, [error, enqueueSnackbar, setError, onError]);

  // Poll PUBLIC endpoint until webhook/confirm has marked order as paid
  async function waitForOrderPaid(piId: string, timeoutMs = 60_000) {
    const start = Date.now();
    let delay = 1200;

    while (Date.now() - start < timeoutMs) {
      try {
        const { data } = await axiosInstance.get<{
          state: string;
          orderId?: string | null;
        }>(`/orders/public/${piId}`);

        const state = String(data?.state || '').toLowerCase();
        if (state === 'paid' || state === 'succeeded') {
          return (data?.orderId as string | undefined) ?? piId;
        }
        if (state === 'canceled' || state === 'requires_payment_method') {
          throw new Error(`Payment ${state}`);
        }
      } catch {
        // transient errors while webhook still running
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 400, 4000);
    }
    return null;
  }

  const bubbleError = (msg: string) => {
    onError?.(msg);
    if (!onError) enqueueSnackbar(msg, { variant: 'error' });
  };

  const onSubmit = async (data: FormData) => {
    if (!stripe || !elements) {
      const msg =
        (t('checkoutForm.errors.stripeNotReady', {
          defaultValue: 'Stripe is not ready yet',
        }) as string) || 'Stripe is not ready yet';
      setError(msg);
      bubbleError(msg);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      // Ensure element fields are valid
      const submitRes = await elements.submit();
      if (submitRes.error) {
        const msg = submitRes.error.message || 'Please check your details.';
        setError(msg);
        setLoading(false);
        setSubmitting(false);
        bubbleError(msg);
        return;
      }

      const addr = data.shippingAddress;
      const countryIso2 = toIso2Country(addr.country);
      const fallbackEmail = auth.currentUser?.email || undefined;
      const billingEmail = (email || '').trim() || fallbackEmail;

      // 1) Create a PaymentMethod (manual flow; Elements is configured with paymentMethodCreation: 'manual')
      const pmRes = await stripe.createPaymentMethod({
        elements,
        params: {
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
      });

      if (pmRes.error || !pmRes.paymentMethod) {
        const msg = prettyStripeError(
          (pmRes as any).error?.code,
          pmRes.error?.message,
        );
        setError(msg);
        setLoading(false);
        setSubmitting(false);
        if (onRefreshIntent) await onRefreshIntent();
        bubbleError(msg);
        return;
      }

      // Derive clientSecret (used only for handleNextAction).
      const derivedClientSecret: string | undefined = (elements as unknown as {
        _clientSecret?: string;
      })
        ? (elements as unknown as { _clientSecret?: string })._clientSecret
        : undefined;
      if (!paymentIntentIdProp && !derivedClientSecret) {
        const msg = 'Client secret missing. Please refresh and try again.';
        setError(msg);
        setLoading(false);
        setSubmitting(false);
        bubbleError(msg);
        return;
      }
      const paymentIntentId =
        paymentIntentIdProp || derivedClientSecret!.split('_secret_')[0];

      // 2) Confirm on the server (single source of truth) and mirror shipping to Stripe
      const confirmPayload = {
        paymentIntentId,
        paymentMethodId: pmRes.paymentMethod.id,
        mirrorToStripe: true,
        customer: {
          name: data.ownerName || addr.fullName,
          email: billingEmail,
          phone: addr.phone,
        },
        shippingAddress: {
          name: addr.fullName || data.ownerName,
          phone: addr.phone,
          address: {
            line1: addr.street,
            city: addr.city,
            postalCode: addr.postalCode,
            country: countryIso2,
          },
        },
      };

      const res = await axiosInstance.post('/orders/confirm', confirmPayload);
      const { status: serverStatus } = res.data || {};

      // 3) Handle 3DS if required
      if (serverStatus === 'requires_action') {
        const na = await stripe.handleNextAction({
          clientSecret: derivedClientSecret!,
        });
        if (na.error) {
          const msg = na.error.message || 'Authentication was cancelled.';
          setError(msg);
          setLoading(false);
          setSubmitting(false);
          if (onRefreshIntent) await onRefreshIntent();
          bubbleError(msg);
          return;
        }
      }

      // 4) Wait for the order to flip to paid (via webhook/confirm)
      const orderId = await waitForOrderPaid(paymentIntentId);
      if (orderId) {
        try {
          clearCart();
          sessionStorage.removeItem('cart-storage'); // your persist key (if used)
          localStorage.removeItem('cart'); // legacy key (if used)
        } catch {
          /* noop */
        }
        setLoading(false);
        setSubmitting(false);

        onPaid?.();
        if (!onPaid)
          enqueueSnackbar('Payment successful 🎉', { variant: 'success' });

        navigate(`/checkout/success?payment_intent=${paymentIntentId}`);
        return;
      }

      // Not paid yet → soft message and allow user to check later
      const softMsg =
        (t('checkoutForm.errors.processing', {
          defaultValue:
            "We are still processing your payment. You'll see your order as soon as it's confirmed.",
        }) as string) ||
        "We are still processing your payment. You'll see your order as soon as it's confirmed.";
      setError(softMsg);
      setLoading(false);
      setSubmitting(false);
      if (onRefreshIntent) await onRefreshIntent();
      bubbleError(softMsg);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (t('checkoutForm.errors.unexpected', {
          defaultValue: 'Unexpected error',
        }) as string);
      setError(String(msg));
      setLoading(false);
      setSubmitting(false);
      if (onRefreshIntent) await onRefreshIntent();
      bubbleError(String(msg));
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
    </Box>
  );
}
