import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';

type FirestoreDate =
  | Date
  | string
  | number
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date };

function asDate(value: FirestoreDate | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === 'object') {
    if ('seconds' in value && typeof value.seconds === 'number') {
      const ns =
        'nanoseconds' in value && typeof value.nanoseconds === 'number'
          ? value.nanoseconds
          : 0;
      const d = new Date(value.seconds * 1000 + Math.floor(ns / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }
    if ('toDate' in value && typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t, i18n } = useTranslation();
  const addr = order.shippingAddress;
  const items = order.items ?? [];
  const amount = typeof order.amount === 'number' ? order.amount : undefined;

  const lng = (i18n.language || 'en').split('-')[0];
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat(lng, {
      style: 'currency',
      currency: 'USD', // change if your store uses a different currency
      maximumFractionDigits: 2,
    }).format(n);
  const fmtDateTime = (d: Date) =>
    new Intl.DateTimeFormat(lng, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);

  // Prefer top-level createdAt/updatedAt, then metadata fallback
  const created = asDate(order.createdAt) ?? asDate(order.metadata?.createdAt);
  const updated = asDate(order.updatedAt) ?? asDate(order.metadata?.updatedAt);

  return (
    <Box
      display="grid"
      gap={1.5}
      gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
    >
      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.customer')}
        </Typography>
        <Typography variant="body2">{order.ownerName ?? '—'}</Typography>
        <Typography variant="body2">{order.email ?? '—'}</Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.shippingAddress')}
        </Typography>
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
        <Typography variant="subtitle2">{t('orderDetails.items')}</Typography>
        {items.length > 0 ? (
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {items.map((it, idx) => {
              const name = it.name ?? '—';
              const qty = it.quantity ?? 0;
              const price =
                typeof it.price === 'number' ? fmtCurrency(it.price) : '—';
              return (
                <li key={`${it.productId}:${idx}`}>
                  <Typography variant="body2">
                    {t('orderDetails.line', { name, qty, price })}
                  </Typography>
                </li>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2">—</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>{t('orderDetails.total')}:</strong>{' '}
          {amount !== undefined ? fmtCurrency(amount) : '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.payment')}</Typography>
        <Typography variant="body2">
          {t('orderDetails.method')}: {order.payment?.method ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.status')}: {order.payment?.status ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.transaction')}: {order.payment?.transactionId ?? '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.delivery')}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.provider')}: {order.delivery?.provider ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.tracking')}: {order.delivery?.trackingNumber ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.eta')}: {order.delivery?.eta ?? '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.created')}</Typography>
        <Typography variant="body2">
          {created ? fmtDateTime(created) : '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.updated')}</Typography>
        <Typography variant="body2">
          {updated ? fmtDateTime(updated) : '—'}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">{t('orderDetails.notes')}</Typography>
        <Typography variant="body2">{order.notes ?? '—'}</Typography>
      </Box>
    </Box>
  );
};

export default OrderExpandedRow;
