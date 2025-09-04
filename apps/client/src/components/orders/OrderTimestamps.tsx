import * as React from 'react';
import { Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { createdDate, updatedDate } from '../../utils/orderSafe';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

type Props = { order: TOrder };

const OrderTimestamps: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();
  const created = createdDate(order);
  const updated = updatedDate(order);

  return (
    <>
      <OrderSection
        title={t('orderDetails.created', { defaultValue: 'Created' })}
      >
        <Typography variant="body2">
          {created ? formatDateTime(created) : '—'}
        </Typography>
      </OrderSection>
      <OrderSection
        title={t('orderDetails.updated', { defaultValue: 'Updated' })}
      >
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : '—'}
        </Typography>
      </OrderSection>
    </>
  );
};

export default OrderTimestamps;
