// src/pages/checkout/CheckoutPage.tsx
import * as React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import ReactDefault, { Suspense } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';

import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';

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
  const theme = useTheme();
  const { themeSettings } = useThemeStore();
  const { t } = useTranslation();

  // ---- Theme-aware tokens
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  // Scalars that respect spacing scale
  const pad = 2 * spacingScale;

  // Vars-safe background & outline
  const paperBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 1)`
    : theme.palette.background.paper;

  const outline =
    theme.vars?.palette?.divider ??
    (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)');

  const baseShadow = isDark ? theme.shadows[3] : theme.shadows[1];

  // ---- Data
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
      <Suspense
        fallback={
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        }
      >
        <StripeProvider>
          <Box
            sx={{
              minHeight: 'calc(100vh - 64px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              py: 4,
              bgcolor: theme.vars?.palette?.background?.defaultChannel
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : theme.palette.background.default,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: pad,
                width: '100%',
                maxWidth: 520,
                borderRadius: radius,
                bgcolor: paperBg,
                border: '1px solid',
                borderColor: outline,
                boxShadow: baseShadow,
              }}
            >
              <Typography variant="h6" mb={1.5 * spacingScale}>
                {t('checkout.title', { defaultValue: 'Checkout' })}
              </Typography>

              <Stack spacing={0.75 * spacingScale} mb={1.5 * spacingScale}>
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

                <Divider sx={{ my: 0.75 * spacingScale }} />

                <Typography fontWeight={700}>
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
                // optional: clear error state in your hook/store
                // console.log('Stripe error closed');
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
