// src/pages/OrderTimestamps.tsx
import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { createdDate, updatedDate } from '../../utils/orderSafe';
import { useLocaleFormatters } from '../../hooks/useLocale';

type Props = { order: TOrder };

const OrderTimestamps: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();

  // Helpful debug: log what the parser *receives*
  // (You should see an object with _seconds/_nanoseconds here.)
  // console.log('createdAt raw', order.createdAt ?? order.metadata?.createdAt);
  // console.log('updatedAt raw', order.updatedAt ?? order.metadata?.updatedAt);
  console.log('order', order);
  const created = createdDate(order); // Date | null
  const updated = updatedDate(order); // Date | null
  console.log('createdAt', created);
  console.log('updatedAt', updated);
  console.log('order', order);
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
