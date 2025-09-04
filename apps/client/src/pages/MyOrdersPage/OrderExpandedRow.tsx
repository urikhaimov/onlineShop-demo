import * as React from 'react';
import { Box, useTheme } from '@mui/material';
import type { TOrder } from '@common/types';
import OrderCustomer from '../../components/orders/OrderCustomer';
import OrderShipping from '../../components/orders/OrderShipping';
import OrderItems from '../../components/orders/OrderItems';
import OrderPayment from '../../components/orders/OrderPayment';
import OrderDelivery from '../../components/orders/OrderDelivery';
import OrderTimestamps from '../../components/orders/OrderTimestamps';
import OrderNotes from '../../components/orders/OrderNotes';
import { useThemeStore } from '../../stores/useThemeStore';

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const mui = useTheme();
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const gap = mui.spacing(Math.max(1, Math.round(2 * spacingScale)));

  return (
    <Box
      sx={{
        display: 'grid',
        gap,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      <OrderCustomer order={order} />
      <OrderShipping order={order} />
      <OrderItems order={order} />
      <OrderPayment order={order} />
      <OrderDelivery order={order} />
      <OrderTimestamps order={order} />
      <OrderNotes order={order} />
    </Box>
  );
};

export default OrderExpandedRow;
