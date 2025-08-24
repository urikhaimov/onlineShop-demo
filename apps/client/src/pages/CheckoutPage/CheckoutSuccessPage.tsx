// src/pages/checkout/CheckoutSuccessPage.tsx
import React from 'react';
import { Box, Typography, Button, Stack, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useConfirmOrder } from '../../hooks/useConfirmOrder';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';

export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { loading, error, setToastOpen } = useConfirmOrder();

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.CHECKOUT}
    >
      <Box
        minHeight="calc(100vh - 64px - 56px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={2}
        py={4}
      >
        <Stack
          spacing={3}
          alignItems="center"
          textAlign="center"
          maxWidth={480}
        >
          <Typography variant="h4" fontWeight={600}>
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

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/')}
            >
              {t('checkoutSuccess.goHome', { defaultValue: 'Go to Home' })}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/my-orders')}>
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
