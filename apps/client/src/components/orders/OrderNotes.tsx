import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { strProp } from '../../utils/orderSafe';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderNotes: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const note = strProp(order as unknown as Record<string, unknown>, 'notes');

  return (
    <OrderSection
      title={t('orderDetails.notes', { defaultValue: 'Notes' })}
      gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
    >
      <Typography variant="body2">{note ?? DASH}</Typography>
    </OrderSection>
  );
};

export default OrderNotes;
