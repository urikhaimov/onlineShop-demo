import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
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
    const d = new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t, i18n } = useTranslation();
  const addr = order?.shippingAddress;
  const items = order?.items ?? [];
  const amount = typeof order?.amount === 'number' ? order.amount : undefined;

  const created = asDate(order?.metadata?.createdAt);
  const updated = asDate(order?.metadata?.updatedAt);

  const lng = (i18n.language || 'en').split('-')[0];
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat(lng, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  const fmtDateTime = (d: Date) =>
    new Intl.DateTimeFormat(lng, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);

  const keyForItem = (it: TOrder['items'][number], idx: number) =>
    `${it.productId || 'no-id'}::${it.name || 'no-name'}::${idx}`;

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
        <Typography variant="body2">{order?.ownerName ?? '—'}</Typography>
        <Typography variant="body2">{order?.email ?? '—'}</Typography>
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
                <li key={keyForItem(it, idx)}>
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
          {t('orderDetails.method')}: {order?.payment?.method ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.status')}: {order?.payment?.status ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.transaction')}:{' '}
          {order?.payment?.transactionId ?? '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.delivery')}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.provider')}: {order?.delivery?.provider ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.tracking')}: {order?.delivery?.trackingNumber ?? '—'}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.eta')}: {order?.delivery?.eta ?? '—'}
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
        <Typography variant="body2">{order?.notes ?? '—'}</Typography>
      </Box>
    </Box>
  );
};

export default OrderExpandedRow;
