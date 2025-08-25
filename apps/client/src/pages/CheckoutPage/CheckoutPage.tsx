// src/pages/checkout/CheckoutPage.tsx
import React, { Suspense } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';
import { useCartStore } from '../../stores/useCartStore';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useStripeClientSecret } from '../../hooks/useStripeClientSecret';
import { stripePromise } from '../../stripe/StripeProvider';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';

const StripeProvider = React.lazy(() => import('../../stripe/StripeProvider'));

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { clientSecret, loading, error } = useStripeClientSecret();

  const cart = useCartStore((s) => s.items);
  const shipping = 5.99;
  const taxRate = 0.17;
  const discount = 3.0;
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * taxRate;
  const total = useCartStore.getState().getCartTotal({
    shipping,
    taxRate,
    discount: discount * 100,
  });

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.CHECKOUT}
    >
      <Suspense fallback={<CircularProgress />}>
        <StripeProvider>
          <Box
            sx={{
              minHeight: 'calc(100vh - 64px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              py: 4,
            }}
          >
            <Paper elevation={1} sx={{ p: 3, width: '100%', maxWidth: 480 }}>
              <Typography variant="h6" mb={2}>
                {t('checkout.title', { defaultValue: 'Checkout' })}
              </Typography>

              <Stack spacing={1} mb={2}>
                <Typography>
                  {t('checkout.subtotal', { defaultValue: 'Subtotal' })}: $
                  {subtotal.toFixed(2)}
                </Typography>
                <Typography>
                  {t('checkout.shipping', { defaultValue: 'Shipping' })}: $
                  {shipping.toFixed(2)}
                </Typography>
                <Typography>
                  {t('checkout.tax', {
                    rate: Math.round(taxRate * 100),
                    defaultValue: 'Tax ({{rate}}%)',
                  })}{' '}
                  : ${tax.toFixed(2)}
                </Typography>
                <Typography>
                  {t('checkout.discount', { defaultValue: 'Discount' })}: -$
                  {discount.toFixed(2)}
                </Typography>
                <Divider />
                <Typography fontWeight="bold">
                  {t('checkout.total', { defaultValue: 'Total' })}:{' '}
                  {(total / 100).toFixed(2)}{' '}
                  {t('checkout.currency', { defaultValue: 'USD' })}
                </Typography>
              </Stack>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeCheckoutForm />
                </Elements>
              ) : (
                <Typography color="error">
                  {t('checkout.failedToLoad', {
                    defaultValue:
                      'Failed to load payment form. Please try again later.',
                  })}
                </Typography>
              )}
            </Paper>

            <Snackbar
              open={!!error}
              autoHideDuration={5000}
              onClose={() => {
                // TODO: Handle error close
                console.log('Error closed');
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            </Snackbar>
          </Box>
        </StripeProvider>
      </Suspense>
    </PageLayout>
  );
}
