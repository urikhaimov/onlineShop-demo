// src/pages/AdminOrdersPage/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';

import { asDate, DASH as EMPTY } from '../../../utils/columns.util'; // ← adjust path if needed
import { useLocaleFormatters } from '../../../hooks/useLocale'; // ← hook-based locale/formatters

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();

  // ✅ locale-aware memoized formatters via hook
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  const toMaybeDate = (v: unknown): Date | undefined => asDate(v as unknown);

  const addr = order.shippingAddress;
  const items = order.items ?? [];
  const amount = order.amount;

  // Prefer top-level createdAt/updatedAt, then metadata fallback
  const created =
    toMaybeDate(order.createdAt) ?? toMaybeDate(order.metadata?.createdAt);
  const updated =
    toMaybeDate(order.updatedAt) ?? toMaybeDate(order.metadata?.updatedAt);

  // Try to format ETA if it's date-like; otherwise show as plain text or EMPTY
  const etaDate = toMaybeDate(
    order.delivery?.eta as string | number | Date | undefined,
  );
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : ((order.delivery?.eta as unknown as string) ?? EMPTY);

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
        <Typography variant="body2">{order.ownerName ?? EMPTY}</Typography>
        <Typography variant="body2">{order.email ?? EMPTY}</Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.shippingAddress')}
        </Typography>
        <Typography variant="body2">
          {addr?.fullName ?? EMPTY}
          <br />
          {[addr?.street, addr?.city].filter(Boolean).join(', ') || EMPTY}
          <br />
          {[addr?.postalCode, addr?.country].filter(Boolean).join(', ') ||
            EMPTY}
          <br />
          {addr?.phone ?? EMPTY}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">{t('orderDetails.items')}</Typography>
        {items.length > 0 ? (
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {items.map((it, idx) => {
              const name = it.name ?? EMPTY;
              const qty = it.quantity ?? 0;
              const price = formatCurrency(it.price);
              return (
                <li key={`${it.productId ?? 'item'}:${idx}`}>
                  <Typography variant="body2">
                    {t('orderDetails.line', { name, qty, price })}
                  </Typography>
                </li>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2">{EMPTY}</Typography>
        )}
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>{t('orderDetails.total')}:</strong>{' '}
          {amount !== undefined ? formatCurrency(amount) : EMPTY}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.payment')}</Typography>
        <Typography variant="body2">
          {t('orderDetails.method')}: {order.payment?.method ?? EMPTY}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.status')}: {order.payment?.status ?? EMPTY}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.transaction')}:{' '}
          {order.payment?.transactionId ?? EMPTY}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('orderDetails.delivery')}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.provider')}: {order.delivery?.provider ?? EMPTY}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.tracking')}:{' '}
          {order.delivery?.trackingNumber ?? EMPTY}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.eta')}: {etaLabel}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.created')}</Typography>
        <Typography variant="body2">
          {created ? formatDateTime(created) : EMPTY}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.updated')}</Typography>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : EMPTY}
        </Typography>
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">{t('orderDetails.notes')}</Typography>
        <Typography variant="body2">{order.notes ?? EMPTY}</Typography>
      </Box>
    </Box>
  );
};

export default OrderExpandedRow;
