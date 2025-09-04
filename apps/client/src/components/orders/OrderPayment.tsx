import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderPayment: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const p = order?.payment; // typed from TOrder

  const method = p?.method?.trim();
  const status = p?.status ? String(p.status) : undefined; // union -> string
  const transactionId =
    p?.transactionId || (order as any)?.paymentIntentId || undefined; // optional fallback

  return (
    <OrderSection
      title={t('orderDetails.payment', { defaultValue: 'Payment' })}
    >
      <Typography variant="body2">
        {t('orderDetails.method', { defaultValue: 'Method' })}: {method || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.status', { defaultValue: 'Status' })}: {status || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.transaction', { defaultValue: 'Transaction' })}:{' '}
        {transactionId || DASH}
      </Typography>
    </OrderSection>
  );
};

export default OrderPayment;
