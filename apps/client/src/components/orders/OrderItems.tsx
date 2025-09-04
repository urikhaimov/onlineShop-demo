import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import {
  itemsFromOrder,
  keyForItem,
  amountMinorToMajor,
} from '../../utils/orderSafe';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };

const OrderItems: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();

  const items = itemsFromOrder(order);
  const totalMajor = amountMinorToMajor(order.totalAmount);

  return (
    <OrderSection
      title={t('orderDetails.items', { defaultValue: 'Items' })}
      gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
    >
      {items.length ? (
        <Box component="ul" sx={{ pl: 3, my: 0 }}>
          {items.map((it, idx) => {
            const name =
              (typeof it.name === 'string' && it.name.trim()) ||
              (typeof it.productId === 'string' && it.productId) ||
              `Item #${idx + 1}`;
            const qty = typeof it.quantity === 'number' ? it.quantity : 0;
            const unit = typeof it.price === 'number' ? it.price : undefined;
            const unitFmt = unit !== undefined ? formatCurrency(unit) : DASH;
            const lineFmt =
              unit !== undefined ? formatCurrency(unit * qty) : DASH;

            return (
              <li key={keyForItem(it, idx)}>
                <Typography variant="body2">
                  {t('orderDetails.line', {
                    defaultValue:
                      '{{name}} — Qty: {{qty}} × {{unit}} = {{line}}',
                    name,
                    qty,
                    unit: unitFmt,
                    price: unitFmt, // keep for legacy translations
                    line: lineFmt,
                  })}
                </Typography>
              </li>
            );
          })}
        </Box>
      ) : (
        <Typography variant="body2">{DASH}</Typography>
      )}

      <Typography variant="body2" sx={{ mt: 0.75 }}>
        <strong>{t('orderDetails.total', { defaultValue: 'Total' })}:</strong>{' '}
        {totalMajor !== undefined ? formatCurrency(totalMajor) : DASH}
      </Typography>
    </OrderSection>
  );
};

export default OrderItems;
