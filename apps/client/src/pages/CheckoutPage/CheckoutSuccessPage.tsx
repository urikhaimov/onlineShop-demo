// src/pages/checkout/CheckoutSuccessPage.tsx
import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Snackbar,
  Alert,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useConfirmOrder } from '../../hooks/useConfirmOrder';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';

export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, error, setToastOpen } = useConfirmOrder();
  const { themeSettings } = useThemeStore();

  const radius = (themeSettings?.borderRadius as number | undefined) ?? 8;
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.CHECKOUT}
    >
      {/* ⬇️ Same container geometry as CheckoutPage */}
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

            {/* Buttons match checkout card proportions; full-width on mobile */}
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
                sx={{
                  borderRadius: radius,
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {t('checkoutSuccess.goHome', { defaultValue: 'Go to Home' })}
              </Button>

              <Button
                variant="outlined"
                onClick={() => navigate('/my-orders')}
                size="large"
                sx={{
                  borderRadius: radius,
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {t('checkoutSuccess.viewOrders', {
                  defaultValue: 'View My Orders',
                })}
              </Button>
            </Stack>

            {loading && (
              <Typography variant="body2" color="text.secondary">
                {t('checkoutSuccess.processing', {
                  defaultValue: 'Processing order...',
                })}
              </Typography>
            )}
          </Stack>
        </Paper>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            {error ||
              t('checkoutSuccess.errors.generic', {
                defaultValue: 'Something went wrong during order confirmation.',
              })}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  );
}
