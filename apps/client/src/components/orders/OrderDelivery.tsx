// src/pages/admin/orders/components/OrderDelivery.tsx
import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { recProp, strProp, asDateLoose, DASH } from '../../utils/orderSafe';
import { useLocaleFormatters } from '../../hooks/useLocale';

type Props = { order: TOrder };

const UNIX_SEC_MIN = 946684800; // 2000-01-01
const UNIX_SEC_MAX = 4102444800; // 2100-01-01
const UNIX_MS_MIN = UNIX_SEC_MIN * 1000;
const UNIX_MS_MAX = UNIX_SEC_MAX * 1000;

const OrderDelivery: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();

  const delivery = recProp<Record<string, unknown> | undefined>(
    order as unknown as Record<string, unknown>,
    ['delivery'],
  );

  const etaRaw = delivery?.['eta'];

  const etaLabel = React.useMemo(() => {
    // 1) Try your robust Firestore/ISO parser
    const d0 = asDateLoose(etaRaw);
    if (d0) return formatDateTime(d0);

    // 2) Numeric string / number → only treat as timestamp if *plausible*
    if (typeof etaRaw === 'string' && /^\d+$/.test(etaRaw)) {
      const n = Number(etaRaw);
      if (n >= UNIX_MS_MIN && n <= UNIX_MS_MAX)
        return formatDateTime(new Date(n)); // ms
      if (n >= UNIX_SEC_MIN && n <= UNIX_SEC_MAX)
        return formatDateTime(new Date(n * 1000)); // sec
      return etaRaw; // not a plausible timestamp → show as plain text
    }
    if (typeof etaRaw === 'number') {
      const n = etaRaw;
      if (n >= UNIX_MS_MIN && n <= UNIX_MS_MAX)
        return formatDateTime(new Date(n)); // ms
      if (n >= UNIX_SEC_MIN && n <= UNIX_SEC_MAX)
        return formatDateTime(new Date(n * 1000)); // sec
      return String(n);
    }

    // 3) Fallback
    return DASH;
  }, [etaRaw, formatDateTime]);

  const provider = strProp(delivery, ['provider']);
  const trackingNumber = strProp(delivery, ['trackingNumber']);

  return (
    <OrderSection
      title={t('orderDetails.delivery', { defaultValue: 'Delivery' })}
    >
      <Typography variant="body2">
        {t('orderDetails.provider', { defaultValue: 'Provider' })}:{' '}
        {provider || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.tracking', { defaultValue: 'Tracking' })}:{' '}
        {trackingNumber || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.eta', { defaultValue: 'ETA' })}: {etaLabel}
      </Typography>
    </OrderSection>
  );
};

export default OrderDelivery;
