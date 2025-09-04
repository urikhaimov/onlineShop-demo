// src/pages/OrderTimestamps.tsx
import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { createdDate, updatedDate, strProp, DASH } from '../../utils/orderSafe';

type Props = { order: TOrder };

const OrderTimestamps: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();

  // Dates via your helpers (handle Firestore Timestamp/_seconds/ISO/number)
  const created = React.useMemo(() => createdDate(order), [order]);
  const updated = React.useMemo(() => updatedDate(order), [order]);

  // Optional "by" labels from metadata
  const createdBy =
    strProp(order as any, ['metadata', 'createdBy', 'name']) ||
    strProp(order as any, ['metadata', 'createdBy', 'email']);

  const updatedBy =
    strProp(order as any, ['metadata', 'updatedBy', 'name']) ||
    strProp(order as any, ['metadata', 'updatedBy', 'email']);

  return (
    <>
      <OrderSection
        title={t('orderDetails.created', { defaultValue: 'Created' })}
      >
        <Typography variant="body2">
          {created ? formatDateTime(created) : DASH}
        </Typography>
        {createdBy && (
          <Typography variant="caption" color="text.secondary">
            {t('orderDetails.by', { defaultValue: 'by' })} {createdBy}
          </Typography>
        )}
      </OrderSection>

      <OrderSection
        title={t('orderDetails.updated', { defaultValue: 'Updated' })}
      >
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : DASH}
        </Typography>
        {updatedBy && (
          <Typography variant="caption" color="text.secondary">
            {t('orderDetails.by', { defaultValue: 'by' })} {updatedBy}
          </Typography>
        )}
      </OrderSection>
    </>
  );
};

export default OrderTimestamps;
