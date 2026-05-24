// src/pages/checkout/CheckoutPage.tsx
import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';

import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';

import PayPalCheckoutForm from './PayPalCheckoutForm';
import { usePayPalOrder } from '../../hooks/usePayPalOrder';
import { useOrderSettings } from '../../hooks/useOrderSettings';

import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { CDefaultCurrency } from '@common/types';
import LoadingProgress from '@client/components/LoadingProgress';
import { useSnackbar } from 'notistack';
import api from '../../api/axiosInstance';

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
  const { enqueueSnackbar } = useSnackbar();
  const { themeSettings } = useThemeStore();

  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  const pad = 2 * spacingScale;

  const paperBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 1)`
    : theme.palette.background.paper;

  const outline =
    theme.vars?.palette?.divider ??
    (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)');

  const baseShadow = isDark ? theme.shadows[3] : theme.shadows[1];

  const cart = useCartStore((s) => s.items);
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
    error: settingsErr,
  } = useOrderSettings();

  const currency = (settings?.currency as string) || CDefaultCurrency || 'ILS';
  const shippingMajor = Number(settings?.shipping ?? 0);
  const taxRatePercent = Number(settings?.taxRate ?? 0);
  const discountMajor = Number(settings?.discount ?? 0);

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

  const fmt = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency }),
    [currency],
  );

  const ready = !settingsLoading && cart.length > 0 && totalMajor > 0;

  const { orderId, loading, error, refresh } = usePayPalOrder(
    ready
      ? {
          totalMajor,
          currency,
          cart,
          shippingMajor,
          taxRatePercent,
          discountMajor,
        }
      : undefined,
  );

  // Persist draft items once we have an orderId
  useEffect(() => {
    (async () => {
      if (!orderId || cart.length === 0) return;
      try {
        await api.post('/orders/save-draft', {
          paypalOrderId: orderId,
          items: cart.map((i) => ({
            productId: i.id,
            name: i.name,
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 0,
            image: pickImage(i),
          })),
        });
      } catch (e: unknown) {
        const axiosErr = e as { response?: { data?: { message?: unknown } } };
        enqueueSnackbar(
          (typeof axiosErr?.response?.data?.message === 'string'
            ? axiosErr.response!.data!.message
            : undefined) ??
            t('checkout.draftSaveFailed', {
              defaultValue: 'Failed to sync draft items.',
            }),
          { variant: 'warning' },
        );
      }
    })();
  }, [orderId, cart, enqueueSnackbar, t]);

  useEffect(() => {
    if (error) {
      enqueueSnackbar(String(error), {
        variant: 'error',
        autoHideDuration: 5000,
      });
    }
  }, [error, enqueueSnackbar]);

  useEffect(() => {
    if (!settingsLoading && settingsError && settingsErr) {
      enqueueSnackbar(String(settingsErr), {
        variant: 'warning',
        autoHideDuration: 4000,
      });
    }
  }, [settingsLoading, settingsError, settingsErr, enqueueSnackbar]);

  if (settingsLoading) return <LoadingProgress />;

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

          {settingsError && !settingsLoading && (
            <Alert severity="warning" sx={{ mb: 1.5 * spacingScale }}>
              {t('checkout.settingsFallback', {
                defaultValue:
                  'Order settings failed to load. Using defaults (0).',
              })}{' '}
              {settingsErr ? String(settingsErr) : ''}
            </Alert>
          )}

          {/* Items list */}
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
                            loading="lazy"
                            decoding="async"
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
              {t('checkout.emptyCart', { defaultValue: 'Your cart is empty' })}
            </Alert>
          )}

          {/* Totals */}
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

          {/* PayPal checkout */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : orderId ? (
            <PayPalCheckoutForm
              paypalOrderId={orderId}
              totalMajor={totalMajor}
              currency={currency}
              onRefreshOrder={refresh}
            />
          ) : (
            <Alert severity="error">
              {error ??
                t('checkout.failedToLoad', {
                  defaultValue:
                    'Failed to load payment form. Please try again later.',
                })}
            </Alert>
          )}
        </Paper>
      </Box>
    </PageLayout>
  );
}
