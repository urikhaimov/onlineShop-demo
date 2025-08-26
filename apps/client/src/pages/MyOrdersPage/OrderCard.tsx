// src/components/orders/OrderCard.tsx
import React from 'react';
import { Paper, Typography, Divider, Chip, Link, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { TOrder as Order } from '@common/types';
import { DASH } from '../../utils/columns.util';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocale';

function getStatusColor(status: string) {
  switch (status) {
    case 'processing':
      return 'warning';
    case 'shipped':
      return 'info';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

// Local, minimal date coercion (handles Date | string | number | Firestore-like)
function toMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object') {
    const v = value as any;
    if (typeof v?.toDate === 'function') {
      try {
        const d = v.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
      } catch {
        return undefined;
      }
    }
    if (typeof v?.seconds === 'number') {
      const ns = typeof v?.nanoseconds === 'number' ? v.nanoseconds : 0;
      const d = new Date(v.seconds * 1000 + Math.floor(ns / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }
  }
  return undefined;
}

type Props = { order: Order };

const OrderCard: React.FC<Props> = ({ order }) => {
  const { i18n } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters(
    i18n.resolvedLanguage || i18n.language,
    'USD', // change currency if needed
  );

  const created =
    toMaybeDate(order.createdAt) ?? toMaybeDate(order.metadata?.createdAt);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
        <Link
          component={RouterLink}
          to={`/order/${order.id}`}
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            color: 'inherit',
            textDecoration: 'none',
            maxWidth: '100%',
          }}
        >
          <Box component="span">Order #</Box>
          <Box
            component="span"
            title={order.id} // full id on hover
            sx={{
              minWidth: 0,
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: 'monospace',
            }}
          >
            {order.id}
          </Box>
        </Link>
      </Typography>

      <Chip
        label={order.status}
        color={getStatusColor(order.status)}
        size="small"
        sx={{ my: 1 }}
      />

      <Typography variant="body2">
        Date: {created ? formatDateTime(created) : DASH}
      </Typography>

      {/* Static placeholders; wire to real payment/shipping when available */}
      <Typography variant="body2">Paid with: Visa ending in 4242</Typography>
      <Typography variant="body2">Shipping: Express Delivery</Typography>
      <Typography variant="body2">Delivery ETA: July 8, 2025</Typography>

      <Typography variant="body2" gutterBottom>
        Total:{' '}
        {typeof order.amount === 'number' ? formatCurrency(order.amount) : DASH}
      </Typography>

      <Divider sx={{ my: 1 }} />

      <Box component="ul" sx={{ m: 0, p: 0, pl: 2 }}>
        {(order.items ?? []).map((item, idx) => (
          <li key={idx}>
            <Typography variant="body2">
              {item.name} × {item.quantity} — Price:{' '}
              {typeof item.price === 'number'
                ? formatCurrency(item.price)
                : DASH}
            </Typography>
          </li>
        ))}
      </Box>
    </Paper>
  );
};

export default OrderCard;
