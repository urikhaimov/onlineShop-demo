// src/pages/checkout/CheckoutSuccessPage.tsx
import * as React from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSnackbar } from 'notistack';
import api from '../../api/axiosInstance';

// Global registries to survive StrictMode double-mounts & cross-components
const CONFIRM_RUNS: Set<string> =
  typeof window !== 'undefined'
    ? ((window as any).__piConfirmRuns ||= new Set<string>())
    : new Set<string>();

const INV_RUNS: Set<string> =
  typeof window !== 'undefined'
    ? ((window as any).__piInventoryRuns ||= new Set<string>())
    : new Set<string>();

export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeSettings } = useThemeStore();
  const { enqueueSnackbar } = useSnackbar();
  const [params] = useSearchParams();
  const paymentIntentId = (params.get('payment_intent') || '').trim();

  const radius = (themeSettings?.borderRadius as number | undefined) ?? 8;
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);

  // One-shot: confirm server-side (creates final order if needed)
  React.useEffect(() => {
    if (!paymentIntentId) return;
    if (CONFIRM_RUNS.has(paymentIntentId)) return;
    CONFIRM_RUNS.add(paymentIntentId);

    let cancelled = false;
    (async () => {
      try {
        await api.post('/orders/confirm', { paymentIntentId });
        // Best-effort inventory confirm (idempotent on server)
        if (!INV_RUNS.has(paymentIntentId)) {
          INV_RUNS.add(paymentIntentId);
          try {
            await api.post('/orders/confirm-inventory', { paymentIntentId });
          } catch (invErr: any) {
            if (!cancelled) {
              const msg =
                invErr?.response?.data?.message ??
                invErr?.message ??
                t('checkoutSuccess.errors.inventory', {
                  defaultValue:
                    'The order was confirmed, but updating stock failed. Our team will review.',
                });
              enqueueSnackbar(String(msg), {
                variant: 'warning',
                autoHideDuration: 6000,
              });
            }
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          t('checkoutSuccess.errors.generic', {
            defaultValue: 'Something went wrong during order confirmation.',
          });
        enqueueSnackbar(String(msg), {
          variant: 'error',
          autoHideDuration: 6000,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentIntentId, t, enqueueSnackbar]);

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
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2.5 * spacingScale,
            width: '100%',
            maxWidth: 480,
            borderRadius: radius,
          }}
          data-testid="order-success"
        >
          <Stack
            spacing={2 * spacingScale}
            alignItems="center"
            textAlign="center"
          >
            <Typography variant="h6" fontWeight={700}>
              {t('checkoutSuccess.title', {
                defaultValue: '🎉 Thank You for Your Order!',
              })}
            </Typography>

            <Typography color="text.secondary">
              {t('checkoutSuccess.subtitle', {
                defaultValue:
                  'We’ve received your payment and your order is being processed.',
              })}
            </Typography>

            {paymentIntentId && (
              <Typography variant="caption" color="text.secondary">
                {t('checkoutSuccess.orderRef', { defaultValue: 'Reference:' })}{' '}
                {paymentIntentId}
              </Typography>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25 * spacingScale}
              sx={{ width: '100%' }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/')}
                size="large"
                sx={{ borderRadius: radius, width: { xs: '100%', sm: 'auto' } }}
              >
                {t('checkoutSuccess.goHome', { defaultValue: 'Go to Home' })}
              </Button>

              <Button
                variant="outlined"
                onClick={() => navigate('/my-orders')}
                size="large"
                sx={{ borderRadius: radius, width: { xs: '100%', sm: 'auto' } }}
              >
                {t('checkoutSuccess.viewOrders', {
                  defaultValue: 'View My Orders',
                })}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </PageLayout>
  );
}
