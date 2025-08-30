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
  useTheme,
} from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';

import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';

import StripeCheckoutForm from './StripeCheckoutForm';
import { useStripeClientSecret } from '../../hooks/useStripeClientSecret';
import { useOrderSettings } from '../../hooks/useOrderSettings';
import { stripePromise } from '../../stripe/StripeProvider';

import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { CDefaultCurrency } from '@common/types';
import LoadingProgress from '@client/components/LoadingProgress';

const StripeProvider = React.lazy(() => import('../../stripe/StripeProvider'));

// small helpers to avoid `any`
type WithImage = { image?: string };
type WithImages = { images?: string[] };
function pickImage(it: unknown): string {
  if (typeof it === 'object' && it !== null) {
    const a = it as WithImage;
    if (typeof a.image === 'string') return a.image;
    const b = it as WithImages;
    if (Array.isArray(b.images) && typeof b.images[0] === 'string')
      return b.images[0];
  }
  return '';
}

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
  const { clientSecret, loading, error, refresh } = useStripeClientSecret();
  const cart = useCartStore((s) => s.items);

  const { data: settings, isLoading: settingsLoading } = useOrderSettings();

  const shipping = settings?.shipping ?? 0;
  const taxRate = settings?.taxRate ?? 0;
  const discount = settings?.discount ?? 0;

  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity ?? 0),
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

              {/* --- Items List --- */}
              {cart.length > 0 ? (
                <>
                  <Typography variant="subtitle2" mb={0.5 * spacingScale}>
                    {t('checkout.items', { defaultValue: 'Items' })} (
                    {cart.length})
                  </Typography>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: outline,
                      borderRadius: radius,
                      p: pad,
                      mb: 1.5 * spacingScale,
                      maxHeight: 260,
                      overflow: 'auto',
                      bgcolor: theme.vars?.palette?.background?.defaultChannel
                        ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.5)`
                        : theme.palette.action.hover,
                    }}
                  >
                    <Stack spacing={0.75 * spacingScale}>
                      {cart.map((item) => {
                        const img = pickImage(item);
                        const qty = item.quantity ?? 0;
                        const price = Number(item.price) || 0;
                        const lineTotal = price * qty;

                        return (
                          <Stack
                            key={item.id}
                            direction="row"
                            alignItems="center"
                            spacing={1.25 * spacingScale}
                            sx={{
                              '&:not(:last-of-type)': {
                                pb: 0.75 * spacingScale,
                                borderBottom: '1px solid',
                                borderColor: outline,
                              },
                            }}
                          >
                            {img ? (
                              <Box
                                component="img"
                                src={img}
                                alt={item.name}
                                sx={{
                                  width: 56,
                                  height: 56,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: outline,
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                  border: '1px dashed',
                                  borderColor: outline,
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                noWrap
                                title={item.name}
                              >
                                {item.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t('checkout.qty', { defaultValue: 'Qty' })}:{' '}
                                {qty} × {price.toFixed(2)}{' '}
                                {t('checkout.currency', {
                                  defaultValue: CDefaultCurrency,
                                })}
                              </Typography>
                            </Box>

                            <Typography variant="body2" fontWeight={600}>
                              {lineTotal.toFixed(2)}{' '}
                              {t('checkout.currency', {
                                defaultValue: CDefaultCurrency,
                              })}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                </>
              ) : (
                <Alert severity="info" sx={{ mb: 1.5 * spacingScale }}>
                  {t('checkout.emptyCart', {
                    defaultValue: 'Your cart is empty',
                  })}
                </Alert>
              )}

              {/* --- Totals --- */}
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
                  {t('checkout.currency', {
                    defaultValue: CDefaultCurrency,
                  })}
                </Typography>
              </Stack>

              {/* --- Stripe --- */}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : clientSecret ? (
                <Elements
                  key={clientSecret} // ✅ remount Payment Element on fresh intents
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <StripeCheckoutForm onRefreshIntent={refresh} />
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
                /* optional: clear error state in your hook/store */
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
