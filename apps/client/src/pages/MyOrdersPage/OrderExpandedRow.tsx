// src/pages/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';

import {
  DASH,
  asDate,
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../../utils/columns.util'; // ← adjust path if needed

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t, i18n } = useTranslation();

  // Locale + memoized formatters
  const lng = getLocale(i18n.resolvedLanguage || i18n.language);
  const formatCurrency = React.useMemo(
    () => makeCurrencyFormatter(lng, 'USD'), // change currency if needed
    [lng],
  );
  const formatDateTime = React.useMemo(() => makeDateTimeFormatter(lng), [lng]);

  const addr = order?.shippingAddress;
  const items = order?.items ?? [];
  const amount = typeof order?.amount === 'number' ? order.amount : undefined;

  // Prefer top-level timestamps, then metadata fallbacks
  const created =
    asDate(order?.createdAt as any) ??
    asDate(order?.metadata?.createdAt as any);
  const updated =
    asDate(order?.updatedAt as any) ??
    asDate(order?.metadata?.updatedAt as any);

  // ETA can be date-like or plain text; try date first, then fallback
  const etaRaw = order?.delivery?.eta as unknown;
  const etaDate = asDate(etaRaw as any);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : typeof etaRaw === 'string' || typeof etaRaw === 'number'
      ? String(etaRaw)
      : DASH;

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
        <Typography variant="body2">{order?.ownerName ?? DASH}</Typography>
        <Typography variant="body2">{order?.email ?? DASH}</Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.shippingAddress')}
        </Typography>
        <Typography variant="body2">
          {addr?.fullName ?? DASH}
          <br />
          {[addr?.street, addr?.city].filter(Boolean).join(', ') || DASH}
          <br />
          {[addr?.postalCode, addr?.country].filter(Boolean).join(', ') || DASH}
          <br />
          {addr?.phone ?? DASH}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">{t('orderDetails.items')}</Typography>

        {items.length > 0 ? (
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {items.map((it, idx) => {
              const name = it.name ?? DASH;
              const qty = it.quantity ?? 0;
              const price =
                typeof it.price === 'number' ? formatCurrency(it.price) : DASH;
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
          <Typography variant="body2">{DASH}</Typography>
        )}

        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>{t('orderDetails.total')}:</strong>{' '}
          {amount !== undefined ? formatCurrency(amount) : DASH}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.payment')}</Typography>
        <Typography variant="body2">
          {t('orderDetails.method')}: {order?.payment?.method ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.status')}: {order?.payment?.status ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.transaction')}:{' '}
          {order?.payment?.transactionId ?? DASH}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.delivery')}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.provider')}: {order?.delivery?.provider ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.tracking')}:{' '}
          {order?.delivery?.trackingNumber ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.eta')}: {etaLabel}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.created')}</Typography>
        <Typography variant="body2">
          {created ? formatDateTime(created) : DASH}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.updated')}</Typography>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : DASH}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">{t('orderDetails.notes')}</Typography>
        <Typography variant="body2">{order?.notes ?? DASH}</Typography>
      </Box>
    </Box>
  );
};

export default OrderExpandedRow;
