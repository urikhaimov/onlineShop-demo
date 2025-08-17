import * as React from 'react';
import { Chip, type ChipProps } from '@mui/material';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as OrderStatus[]).map(
  (k) => ({ label: STATUS_LABELS[k], value: k }),
);

/** Map each status to a Chip color */
function statusToColor(status: OrderStatus): ChipProps['color'] {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'info';
    case 'shipped':
      return 'primary';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export type StatusTagProps = {
  value?: string | null | undefined;
  size?: ChipProps['size'];
  variant?: ChipProps['variant']; // 'filled' | 'outlined'
  sx?: ChipProps['sx'];
};

export function StatusTag({
  value,
  size = 'small',
  variant = 'filled',
  sx,
}: StatusTagProps) {
  const v = (value ?? '').toLowerCase() as OrderStatus;
  const isKnown = (Object.keys(STATUS_LABELS) as OrderStatus[]).includes(v);
  const label = isKnown ? STATUS_LABELS[v] : (value ?? '—');
  const color = isKnown ? statusToColor(v) : ('default' as const);

  return (
    <Chip
      label={label}
      color={color}
      variant={variant}
      size={size}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 500,
        ...sx,
      }}
    />
  );
}
