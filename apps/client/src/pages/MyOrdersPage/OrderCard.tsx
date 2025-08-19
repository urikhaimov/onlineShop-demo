// src/components/orders/OrderCard.tsx
import React from 'react';
import { Paper, Typography, Divider, Chip, Link, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { TOrder as Order } from '@common/types';
import { formatCurrency } from '../../utils/formatCurrency';
import { asDate } from '../../utils/asDate';
import { format } from 'date-fns';

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

type Props = { order: Order };

const OrderCard: React.FC<Props> = ({ order }) => {
  const created = asDate(order.createdAt) ?? asDate(order.metadata?.createdAt);

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
        <Box
          component={RouterLink}
          to={`/order/${order.id}`}
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            textDecoration: 'none',
            color: 'inherit',
            maxWidth: '100%',
          }}
        >
          <Box component="span">Order #</Box>
          <Box
            component="span"
            title={order.id} // full id on hover
            sx={{
              minWidth: 0, // allow shrinking
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis', // ← ellipsis here
              fontFamily: 'monospace',
            }}
          >
            {order.id}
          </Box>
        </Box>
      </Typography>

      <Chip
        label={order.status}
        color={getStatusColor(order.status)}
        size="small"
        sx={{ my: 1 }}
      />

      <Typography variant="body2">
        Date: {created ? format(created, 'PPpp') : '—'}
      </Typography>

      <Typography variant="body2">Paid with: Visa ending in 4242</Typography>
      <Typography variant="body2">Shipping: Express Delivery</Typography>
      <Typography variant="body2">Delivery ETA: July 8, 2025</Typography>

      <Typography variant="body2" gutterBottom>
        Total: {formatCurrency(order.amount)}
      </Typography>

      <Divider sx={{ my: 1 }} />

      <Box component="ul" sx={{ m: 0, p: 0, pl: 2 }}>
        {order.items.map((item, idx) => (
          <li key={idx}>
            <Typography variant="body2">
              {item.name} × {item.quantity} — Price:{' '}
              {formatCurrency(item.price)}
            </Typography>
          </li>
        ))}
      </Box>
    </Paper>
  );
};

export default OrderCard;
