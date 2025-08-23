// src/pages/admin/orders/components/OrderSummaryCard.tsx
import React from 'react';
import { Paper, Typography, Divider, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  order: {
    items?: Array<{
      price: number;
      quantity: number;
    }>;
    shippingAddress?: {
      fullName?: string;
      phone?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    payment?: {
      method?: string;
      status?: 'paid' | 'unpaid';
      transactionId?: string;
    };
  };
}

export default function OrderSummaryCard({ order }: Props) {
  const { t } = useTranslation();

  const items = order.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Narrow to the union so Chip color can be typed precisely
  const paymentStatus: 'paid' | 'unpaid' =
    order.payment?.status === 'paid' ? 'paid' : 'unpaid';
  const paymentColor: 'success' | 'warning' =
    paymentStatus === 'paid' ? 'success' : 'warning';

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('orderSummary.title', { defaultValue: 'Order Summary' })}
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {t('orderSummary.subtotal', { defaultValue: 'Subtotal' })}:
        </Typography>
        <Typography>${subtotal.toFixed(2)}</Typography>
      </Box>

      {order.shippingAddress && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {t('orderSummary.customer', { defaultValue: 'Customer' })}:
            </Typography>
            <Typography>{order.shippingAddress.fullName || '—'}</Typography>
            <Typography variant="body2">
              {order.shippingAddress.phone || '—'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {t('orderSummary.shippingAddress', {
                defaultValue: 'Shipping Address',
              })}
              :
            </Typography>
            <Typography variant="body2">
              {order.shippingAddress.street || ''},{' '}
              {order.shippingAddress.city || ''},{' '}
              {order.shippingAddress.postalCode || ''},{' '}
              {order.shippingAddress.country || ''}
            </Typography>
          </Box>
        </>
      )}

      {order.payment && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {t('orderSummary.payment', { defaultValue: 'Payment' })}:
            </Typography>
            <Typography variant="body2">
              {order.payment.method ||
                t('orderSummary.na', { defaultValue: 'N/A' })}
            </Typography>
            <Chip
              label={t(`orderSummary.paymentStatus.${paymentStatus}`, {
                defaultValue: paymentStatus.toUpperCase(),
              })}
              color={paymentColor}
              size="small"
              sx={{ mt: 0.5 }}
            />
            {order.payment.transactionId && (
              <Typography variant="caption" display="block">
                {t('orderSummary.tx', { defaultValue: 'Tx' })}:{' '}
                {order.payment.transactionId}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
