// src/pages/AdminOrdersPage/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';

import { DASH as EMPTY } from '../../../utils/columns.util';
import { useLocaleFormatters } from '../../../hooks/useLocale';
import { asDateLoose } from '../../../utils/date.util'; // ← use the shared parser
// If you placed asDateLoose in columns.util instead, import from there.

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  const addr = order.shippingAddress;
  const items = order.items ?? [];

  // Prefer top-level createdAt/updatedAt; fallback to metadata.*
  const createdDate =
    asDateLoose((order as any).createdAt) ??
    asDateLoose(order.metadata?.createdAt);
  const updatedDate =
    asDateLoose((order as any).updatedAt) ??
    asDateLoose(order.metadata?.updatedAt);

  // ETA
  const etaDate = asDateLoose(order.delivery?.eta as any);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : ((order.delivery?.eta as unknown as string) ?? EMPTY);

  // Totals in minor units (e.g., agorot/cents)
  const totalMinor = (order as any).totalAmount;
  const totalLabel =
    typeof totalMinor === 'number' ? formatCurrency(totalMinor / 100) : EMPTY;

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
              const price = formatCurrency(
                typeof it.price === 'number' ? it.price : 0,
              );
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
          <strong>{t('orderDetails.total')}:</strong> {totalLabel}
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
          {createdDate ? formatDateTime(createdDate) : EMPTY}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('orderDetails.updated')}</Typography>
        <Typography variant="body2">
          {updatedDate ? formatDateTime(updatedDate) : EMPTY}
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
