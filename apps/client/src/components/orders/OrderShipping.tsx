import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const clean = (v?: string | null) => (typeof v === 'string' ? v.trim() : '');

const joinParts = (...xs: Array<string | undefined | null>) =>
  xs.map(clean).filter(Boolean).join(', ');

const OrderShipping: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const a = order.shippingAddress; // <-- read directly from typed TOrder

  const fullName = clean(a?.fullName) || DASH;
  const line1 = joinParts(a?.street, a?.city) || DASH;
  const line2 = joinParts(a?.postalCode, a?.country) || DASH;
  const phone = clean(a?.phone) || DASH;

  return (
    <OrderSection
      title={t('orderDetails.shippingAddress', {
        defaultValue: 'Shipping address',
      })}
    >
      <Typography variant="body2">{fullName}</Typography>
      <Typography variant="body2">{line1}</Typography>
      <Typography variant="body2">{line2}</Typography>
      <Typography variant="body2">{phone}</Typography>
    </OrderSection>
  );
};

export default OrderShipping;
