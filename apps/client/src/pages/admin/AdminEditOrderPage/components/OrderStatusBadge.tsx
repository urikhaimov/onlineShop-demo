import React from 'react';
import { Chip } from '@mui/material';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

interface Props {
  status?: string; // Made optional + looser to allow flexibility
}

const statusColors: Record<
  OrderStatus,
  'default' | 'info' | 'warning' | 'success' | 'error'
> = {
  pending: 'default',
  confirmed: 'info',
  shipped: 'warning',
  delivered: 'success',
  cancelled: 'error',
};

export default function OrderStatusBadge({ status }: Props) {
  const safeStatus = (status as OrderStatus) ?? 'pending';
  const color = statusColors[safeStatus] || 'default';

  return (
    <Chip
      label={(safeStatus || 'UNKNOWN').toUpperCase()}
      color={color}
      variant="outlined"
      sx={{ mt: 1 }}
    />
  );
}
