// apps/client/src/components/orders/OrderItems.tsx
import * as React from 'react';
import { Card, CardContent, Typography, Stack } from '@mui/material';
import type { TOrder } from '@common/types';

const ZERO_DEC = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function toMajorFromMinor(minor?: number, currency?: string) {
  if (minor === null) return undefined;
  const cur = (currency || '').toUpperCase();
  return ZERO_DEC.has(cur) ? Math.round(minor) : minor / 100;
}

function displayTotal(order: TOrder): number {
  const currency = (order.currency ||
    order.payment?.currency ||
    'ILS') as string;

  // prefer explicit 'total' (major)
  if (typeof order.total === 'number') return order.total;

  // accept 'totalMajor' (major) used by draft rows
  const totalMajor = (order as any).totalMajor;
  if (typeof totalMajor === 'number') return totalMajor;

  // legacy/minor fields
  const totalAmount = (order as any).totalAmount; // minor
  if (typeof totalAmount === 'number')
    return toMajorFromMinor(totalAmount, currency) ?? 0;

  const totalMinor = (order as any).totalMinor; // minor (draft rows)
  if (typeof totalMinor === 'number')
    return toMajorFromMinor(totalMinor, currency) ?? 0;

  return 0;
}

type Props = { order: TOrder };

const OrderItems: React.FC<Props> = ({ order }) => {
  const items = order.items ?? [];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Items
        </Typography>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {items.map((i, idx) => (
              <Typography key={idx} variant="body2">
                {i.quantity}× {i.name} —{' '}
                {order.currency ?? order.payment?.currency ?? 'ILS'}{' '}
                {i.price.toFixed(2)}
              </Typography>
            ))}
          </Stack>
        )}

        <Typography sx={{ mt: 1.25 }} fontWeight={600}>
          Total:{' '}
          {(order.currency ?? order.payment?.currency ?? 'ILS').toUpperCase()}{' '}
          {displayTotal(order).toFixed(2)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OrderItems;
