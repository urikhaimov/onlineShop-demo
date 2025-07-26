import React from 'react';
import { Paper, Typography, Divider, Box, Chip } from '@mui/material';

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
  const items = order.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const paymentStatus = order.payment?.status ?? 'unpaid';
  const paymentColor = paymentStatus === 'paid' ? 'success' : 'warning';

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Order Summary
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Subtotal:</Typography>
        <Typography>${subtotal.toFixed(2)}</Typography>
      </Box>

      {order.shippingAddress && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Customer:</Typography>
            <Typography>{order.shippingAddress.fullName || '—'}</Typography>
            <Typography variant="body2">
              {order.shippingAddress.phone || '—'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Shipping Address:</Typography>
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
            <Typography variant="subtitle2">Payment:</Typography>
            <Typography variant="body2">
              {order.payment.method || 'N/A'}
            </Typography>
            <Chip
              label={paymentStatus.toUpperCase()}
              color={paymentColor}
              size="small"
            />
            {order.payment.transactionId && (
              <Typography variant="caption" display="block">
                Tx: {order.payment.transactionId}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
