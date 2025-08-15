import React from 'react';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { TOrder } from '@common/types';

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds?: number };
    return new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
  }
  return undefined;
}

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const addr = order?.shippingAddress;
  const items = order?.items ?? [];
  const amount = typeof order?.amount === 'number' ? order.amount : undefined;

  const created = asDate(order?.metadata?.createdAt);
  const updated = asDate(order?.metadata?.updatedAt);

  const keyForItem = (it: TOrder['items'][number], idx: number) =>
    `${it.productId || 'no-id'}::${it.name || 'no-name'}::${idx}`;

  return (
    <Box
      display="grid"
      gap={1.5}
      gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
    >
      <Box>
        <Typography variant="subtitle2">Customer</Typography>
        <Typography variant="body2">{order?.ownerName ?? '—'}</Typography>
        <Typography variant="body2">{order?.email ?? '—'}</Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Shipping Address</Typography>
        <Typography variant="body2">
          {addr?.fullName ?? '—'}
          <br />
          {[addr?.street, addr?.city].filter(Boolean).join(', ') || '—'}
          <br />
          {[addr?.postalCode, addr?.country].filter(Boolean).join(', ') || '—'}
          <br />
          {addr?.phone ?? '—'}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">Items</Typography>
        {items.length > 0 ? (
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {items.map((it, idx) => (
              <li key={keyForItem(it, idx)}>
                <Typography variant="body2">
                  {it.name ?? '—'} — {it.quantity ?? 0} × $
                  {typeof it.price === 'number' ? it.price.toFixed(2) : '—'}
                </Typography>
              </li>
            ))}
          </Box>
        ) : (
          <Typography variant="body2">—</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>Total:</strong>{' '}
          {amount !== undefined ? `$${amount.toFixed(2)}` : '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Payment</Typography>
        <Typography variant="body2">
          Method: {order?.payment?.method ?? '—'}
        </Typography>
        <Typography variant="body2">
          Status: {order?.payment?.status ?? '—'}
        </Typography>
        <Typography variant="body2">
          Txn: {order?.payment?.transactionId ?? '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Delivery</Typography>
        <Typography variant="body2">
          Provider: {order?.delivery?.provider ?? '—'}
        </Typography>
        <Typography variant="body2">
          Tracking: {order?.delivery?.trackingNumber ?? '—'}
        </Typography>
        <Typography variant="body2">
          ETA: {order?.delivery?.eta ?? '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Created</Typography>
        <Typography variant="body2">
          {created ? format(created, 'PPpp') : '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">Updated</Typography>
        <Typography variant="body2">
          {updated ? format(updated, 'PPpp') : '—'}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">Notes</Typography>
        <Typography variant="body2">{order?.notes ?? '—'}</Typography>
      </Box>
    </Box>
  );
};

export default OrderExpandedRow;
