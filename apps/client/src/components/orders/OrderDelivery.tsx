import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { recProp, strProp } from '../../utils/orderSafe';
import { asDate, DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';

type Props = { order: TOrder };

const OrderDelivery: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();

  const delivery = recProp(
    order as unknown as Record<string, unknown>,
    'delivery',
  );
  const etaRaw = delivery?.['eta'] as string | number | Date | undefined;
  const etaDate = asDate(etaRaw);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : typeof etaRaw === 'string' || typeof etaRaw === 'number'
      ? String(etaRaw)
      : DASH;

  return (
    <OrderSection
      title={t('orderDetails.delivery', { defaultValue: 'Delivery' })}
    >
      <Typography variant="body2">
        {t('orderDetails.provider', { defaultValue: 'Provider' })}:{' '}
        {strProp(delivery, 'provider') ?? DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.tracking', { defaultValue: 'Tracking' })}:{' '}
        {strProp(delivery, 'trackingNumber') ?? DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.eta', { defaultValue: 'ETA' })}: {etaLabel}
      </Typography>
    </OrderSection>
  );
};

export default OrderDelivery;
