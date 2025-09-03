// src/pages/checkout/CheckoutPage.tsx
import React, { useMemo } from 'react';
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
import type { StripeElementsOptions } from '@stripe/stripe-js';

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

// small helpers to avoid `any`
type WithImage = { image?: string };
type WithImages = { images?: string[] };
function pickImage(it: unknown): string {
  if (typeof it === 'object' && it !== null) {
    const a = it as WithImage;
    if (typeof a.image === 'string') return a.image;
    const b = it as WithImages;
    if (Array.isArray(b.images) && typeof b.images[0] === 'string') {
      return b.images[0];
    }
  }
  return '';
}

export default function CheckoutPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { themeSettings } = useThemeStore();

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

  // ---- Data hooks (run every render)
  const { clientSecret, loading, error, refresh } = useStripeClientSecret();
  const cart = useCartStore((s) => s.items);
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
    error: settingsErr,
  } = useOrderSettings();

  // Settings with safe fallbacks (can be read while loading)
  const currency = (settings?.currency as string) || CDefaultCurrency || 'ILS';
  const shippingMajor = Number(settings?.shipping ?? 0);
  const taxRatePercent = Number(settings?.taxRate ?? 0); // ✅ percent (e.g., 17)
  const discountMajor = Number(settings?.discount ?? 0);

  // Totals in MAJOR units (memoized)
  const { subtotal, tax, totalMajor } = useMemo(() => {
    const subtotalCalc = cart.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0,
    );
    const taxCalc = +(subtotalCalc * (taxRatePercent / 100)).toFixed(2);
    const totalCalc = +(
      subtotalCalc +
      taxCalc +
      shippingMajor -
      discountMajor
    ).toFixed(2);
    return { subtotal: subtotalCalc, tax: taxCalc, totalMajor: totalCalc };
  }, [cart, taxRatePercent, shippingMajor, discountMajor]);

  // Number formatter (memoize to avoid re-creating on each render)
  const fmt = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency }),
    [currency],
  );

  // Loading gate AFTER hooks
  if (settingsLoading) return <LoadingProgress />;

  // Stripe Elements options (hide Apple Pay/Link in dev to silence warnings)
  const isProd = import.meta.env.PROD;
  const elementsOptions: StripeElementsOptions = {
    clientSecret: clientSecret ?? undefined,
    ...(isProd
      ? {}
      : {
          wallets: { applePay: 'never' }, // hide Apple Pay on localhost
          paymentMethodOrder: ['card'], // omit 'link'
        }),
    appearance: {
      theme: isDark ? 'night' : 'stripe',
      rules: {
        '.Input': {
          borderRadius: '8px',
        },
      },
    },
  };

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.CHECKOUT}
    >
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

          {settingsError && (
            <Alert severity="warning" sx={{ mb: 1.5 * spacingScale }}>
              {t('checkout.settingsFallback', {
                defaultValue:
                  'Order settings failed to load. Using defaults (0).',
              })}{' '}
              {settingsErr ? String(settingsErr) : ''}
            </Alert>
          )}

          {/* --- Items List --- */}
          {cart.length > 0 ? (
            <>
              <Typography variant="subtitle2" mb={0.5 * spacingScale}>
                {t('checkout.items', { defaultValue: 'Items' })} ({cart.length})
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
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.price) || 0;
                    const lineTotal = +(price * qty).toFixed(2);

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
                          <Typography variant="body2" noWrap title={item.name}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('checkout.qty', { defaultValue: 'Qty' })}: {qty}{' '}
                            × {fmt.format(price)}
                          </Typography>
                        </Box>

                        <Typography variant="body2" fontWeight={600}>
                          {fmt.format(lineTotal)}
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
              {t('checkout.subtotal', { defaultValue: 'Subtotal' })}:{' '}
              {fmt.format(subtotal)}
            </Typography>
            <Typography>
              {t('checkout.shipping', { defaultValue: 'Shipping' })}:{' '}
              {fmt.format(shippingMajor)}
            </Typography>
            <Typography>
              {t('checkout.tax', {
                rate: Math.round(taxRatePercent),
                defaultValue: 'Tax ({{rate}}%)',
              })}
              : {fmt.format(tax)}
            </Typography>
            <Typography>
              {t('checkout.discount', { defaultValue: 'Discount' })}: -
              {fmt.format(discountMajor)}
            </Typography>

            <Divider sx={{ my: 0.75 * spacingScale }} />

            <Typography fontWeight={700}>
              {t('checkout.total', { defaultValue: 'Total' })}:{' '}
              {fmt.format(totalMajor)}
            </Typography>
          </Stack>

          {/* --- Stripe --- */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : clientSecret ? (
            <Elements
              key={clientSecret}
              stripe={stripePromise}
              options={elementsOptions}
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
          onClose={(_, reason) => {
            // No clearError available; just close the Snackbar
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            {String(error || '')}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  );
}
