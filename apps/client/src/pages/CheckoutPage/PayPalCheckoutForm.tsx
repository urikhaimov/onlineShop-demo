import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

import FormTextField from '../../components/FormTextField';
import { useCartStore } from '../../stores/useCartStore';
import { usePayPalCheckoutStore } from '../../stores/usePayPalCheckoutStore';
import axiosInstance from '../../api/axiosInstance';

type ShippingAddress = {
  fullName: string;
  email: string;
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

type PayPalCheckoutFormProps = {
  paypalOrderId: string;
  totalMajor?: number;
  currency?: string;
  onRefreshOrder?: () => Promise<void>;
};

const toIso2Country = (input: string): string => {
  const s = (input || '').trim().toUpperCase();
  if (s.length === 2) return s;
  const map: Record<string, string> = {
    ISRAEL: 'IL',
    'UNITED STATES': 'US',
    USA: 'US',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    RUSSIA: 'RU',
    FRANCE: 'FR',
    GERMANY: 'DE',
    CANADA: 'CA',
    AUSTRALIA: 'AU',
  };
  return map[s] ?? s.slice(0, 2);
};

export default function PayPalCheckoutForm({
  paypalOrderId,
  onRefreshOrder,
}: PayPalCheckoutFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [{ isPending }] = usePayPalScriptReducer();

  const clearCart = useCartStore((s) => s.clearCart);
  const { loading, error, setError, setLoading } = usePayPalCheckoutStore();

  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    abortRef.current = new AbortController();
    return () => abortRef.current?.abort();
  }, []);

  const {
    register,
    handleSubmit,
    getValues,
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

  // Surface store errors via toast once, then clear
  React.useEffect(() => {
    if (!error) return;
    enqueueSnackbar(error, { variant: 'error', autoHideDuration: 5000 });
    setError(null);
  }, [error, enqueueSnackbar, setError]);

  const waitForOrderPaid = React.useCallback(
    async (orderId: string, timeoutMs = 60_000) => {
      const start = Date.now();
      let delay = 1200;
      while (
        !abortRef.current?.signal.aborted &&
        Date.now() - start < timeoutMs
      ) {
        try {
          const { data } = await axiosInstance.get<{
            state: string;
            orderId?: string;
          }>(`/orders/public/${orderId}`, {
            timeout: 10_000,
            signal: abortRef.current?.signal,
          });
          const state = String(data?.state || '').toLowerCase();
          if (state === 'paid' || state === 'succeeded') {
            return (data?.orderId as string | undefined) ?? orderId;
          }
          if (state === 'canceled') throw new Error('Payment canceled');
        } catch {
          // transient while webhook runs
        }
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay + 400, 4000);
      }
      return null;
    },
    [],
  );

  // Called by PayPalButtons to return the already-created server-side order ID
  const handleCreateOrder = React.useCallback(() => {
    return Promise.resolve(paypalOrderId);
  }, [paypalOrderId]);

  // Called after buyer approves in the PayPal popup
  const handleApprove = React.useCallback(
    async (_data: { orderID: string }) => {
      setLoading(true);
      setError(null);

      const formData = getValues();
      const addr = formData.shippingAddress;
      const countryIso2 = toIso2Country(addr.country);

      try {
        // Persist draft details before capture
        await axiosInstance.post(
          '/orders/save-draft',
          {
            paypalOrderId,
            customer: {
              name: formData.ownerName || addr.fullName,
              email: addr.email,
              phone: addr.phone,
            },
            shippingAddress: {
              name: addr.fullName || formData.ownerName,
              phone: addr.phone,
              address: {
                line1: addr.street,
                city: addr.city,
                postalCode: addr.postalCode,
                country: countryIso2,
              },
            },
          },
          { signal: abortRef.current?.signal },
        );

        // Capture on the server
        await axiosInstance.post(
          '/orders/capture-paypal-order',
          {
            orderId: paypalOrderId,
            customer: {
              name: formData.ownerName || addr.fullName,
              email: addr.email,
              phone: addr.phone,
            },
            shippingAddress: {
              name: addr.fullName || formData.ownerName,
              phone: addr.phone,
              address: {
                line1: addr.street,
                city: addr.city,
                postalCode: addr.postalCode,
                country: countryIso2,
              },
            },
          },
          { timeout: 45_000, signal: abortRef.current?.signal },
        );

        // Poll until the Firestore order is paid
        const orderId = await waitForOrderPaid(paypalOrderId);

        try {
          clearCart();
          sessionStorage.removeItem('cart-storage');
          localStorage.removeItem('cart');
        } catch {
          // ignore
        }

        setLoading(false);

        if (orderId) {
          enqueueSnackbar('Payment successful 🎉', { variant: 'success' });
          navigate(`/checkout/success?paypal_order=${paypalOrderId}`);
        } else {
          enqueueSnackbar(
            t('checkoutForm.errors.processing', {
              defaultValue:
                "We are still processing your payment. You'll see your order once confirmed.",
            }),
            { variant: 'warning' },
          );
          if (onRefreshOrder) await onRefreshOrder();
        }
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: unknown } };
          message?: string;
        };
        const msg =
          (Array.isArray(axiosErr?.response?.data?.message)
            ? axiosErr.response!.data!.message!.toString()
            : typeof axiosErr?.response?.data?.message === 'string'
              ? axiosErr.response!.data!.message
              : undefined) ??
          axiosErr?.message ??
          'Payment failed. Please try again.';
        setError(String(msg));
        setLoading(false);
        if (onRefreshOrder) await onRefreshOrder();
      }
    },
    [
      paypalOrderId,
      getValues,
      clearCart,
      navigate,
      enqueueSnackbar,
      t,
      onRefreshOrder,
      setError,
      setLoading,
      waitForOrderPaid,
    ],
  );

  const handleError = React.useCallback(
    (err: Record<string, unknown>) => {
      const msg = String(
        err?.message ?? 'PayPal payment failed. Please try again.',
      );
      setError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    },
    [setError, enqueueSnackbar],
  );

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(() => {
        // Submission is handled by PayPal buttons; this prevents accidental native submit
      })}
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
        label={t('checkoutForm.email', { defaultValue: 'Email' })}
        register={register('shippingAddress.email', {
          required: t('checkoutForm.emailRequired', {
            defaultValue: 'Email is required',
          }) as string,
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Invalid email address',
          },
        })}
        errorObject={errors.shippingAddress?.email}
        type="email"
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

      <Box sx={{ mt: 2 }}>
        {isPending || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <PayPalButtons
            style={{
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'pay',
            }}
            createOrder={handleCreateOrder}
            onApprove={handleApprove}
            onError={handleError}
            onCancel={() =>
              enqueueSnackbar(
                t('checkoutForm.paypalCanceled', {
                  defaultValue: 'Payment canceled.',
                }),
                { variant: 'warning' },
              )
            }
          />
        )}
      </Box>

      {/* Fallback submit button (hidden — keeps form submit accessible) */}
      <Button type="submit" sx={{ display: 'none' }} aria-hidden="true" />
    </Box>
  );
}
