import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import {
  coalesce,
  extractCustomer,
  recProp,
  strProp,
} from '../../utils/orderSafe';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderCustomer: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const r = order as unknown as Record<string, unknown>;
  const meta = recProp(r, 'metadata');
  const payment = recProp(r, 'payment');
  const addr = recProp(r, 'shippingAddress');

  const customer = extractCustomer(order);
  const name = coalesce(
    customer?.name,
    strProp(r, 'ownerName'),
    strProp(addr, 'fullName'),
    strProp(recProp(meta, 'createdBy'), 'name'),
  );
  const email = coalesce(
    customer?.email,
    strProp(r, 'email'),
    strProp(payment, 'receipt_email'),
    strProp(meta, 'email'),
  );
  const phone = coalesce(customer?.phone, strProp(addr, 'phone'));

  return (
    <OrderSection
      title={t('orderDetails.customer', { defaultValue: 'Customer' })}
    >
      <Typography variant="body2">{name}</Typography>
      <Typography variant="body2" color="text.secondary">
        {email || DASH}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {phone}
      </Typography>
    </OrderSection>
  );
};

export default OrderCustomer;
