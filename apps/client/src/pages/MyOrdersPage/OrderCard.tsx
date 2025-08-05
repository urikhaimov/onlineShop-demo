// src/components/orders/OrderCard.tsx
import React from 'react';
import { Paper, Typography, Divider, Chip, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { TOrder as Order } from '@common/types';
import { formatCurrency } from '../../utils/format';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { PageLayout } from '../../layouts/page.layout';

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

type Props = {
  order: Order;
};

const OrderCard: React.FC<Props> = ({ order }) => {
  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.CART}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          <Link
            component={RouterLink}
            to={`/order/${order.id}`}
            underline="hover"
            sx={{ cursor: 'pointer' }}
          >
            Order #{order.id}
          </Link>
        </Typography>

        <Chip
          label={order.status}
          color={getStatusColor(order.status)}
          size="small"
          sx={{ my: 1 }}
        />

        <Typography variant="body2">
          Date:{' '}
          {typeof order.createdAt === 'string'
            ? new Date(order.createdAt).toLocaleString()
            : (order.createdAt.toDate?.().toLocaleString?.() ?? 'Invalid date')}
        </Typography>

        <Typography variant="body2">Paid with: Visa ending in 4242</Typography>

        <Typography variant="body2">Shipping: Express Delivery</Typography>

        <Typography variant="body2">Delivery ETA: July 8, 2025</Typography>

        <Typography variant="body2" gutterBottom>
          Total: {formatCurrency(order.amount)}
        </Typography>

        <Divider sx={{ my: 1 }} />

        <ul style={{ margin: 0, padding: 0 }}>
          {order.items.map((item, idx) => (
            <li key={idx}>
              {item.name} × {item.quantity} — Price:{' '}
              {formatCurrency(item.price)}
            </li>
          ))}
        </ul>
      </Paper>
    </PageLayout>
  );
};

export default OrderCard;
