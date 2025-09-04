import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { recProp, strProp } from '../../utils/orderSafe';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderShipping: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const addr = recProp(
    order as unknown as Record<string, unknown>,
    'shippingAddress',
  );

  return (
    <OrderSection
      title={t('orderDetails.shippingAddress', {
        defaultValue: 'Shipping address',
      })}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {strProp(addr, 'fullName') ?? DASH}
        {'\n'}
        {[strProp(addr, 'street'), strProp(addr, 'city')]
          .filter(Boolean)
          .join(', ') || DASH}
        {'\n'}
        {[strProp(addr, 'postalCode'), strProp(addr, 'country')]
          .filter(Boolean)
          .join(', ') || DASH}
        {'\n'}
        {strProp(addr, 'phone') ?? DASH}
      </Typography>
    </OrderSection>
  );
};

export default OrderShipping;
