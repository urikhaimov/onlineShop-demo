import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { recProp, strProp } from '../../utils/orderSafe';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderPayment: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const payment = recProp(
    order as unknown as Record<string, unknown>,
    'payment',
  );

  return (
    <OrderSection
      title={t('orderDetails.payment', { defaultValue: 'Payment' })}
    >
      <Typography variant="body2">
        {t('orderDetails.method', { defaultValue: 'Method' })}:{' '}
        {strProp(payment, 'method') ?? DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.status', { defaultValue: 'Status' })}:{' '}
        {strProp(payment, 'status') ?? DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.transaction', { defaultValue: 'Transaction' })}:{' '}
        {strProp(payment, 'transactionId') ?? DASH}
      </Typography>
    </OrderSection>
  );
};

export default OrderPayment;
