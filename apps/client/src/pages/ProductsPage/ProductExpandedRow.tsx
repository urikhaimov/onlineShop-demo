// src/pages/admin/ProductExpandedRow.tsx
import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { IProduct } from '@common/types';
import { useTranslation } from 'react-i18next';
import { asDateLoose } from '../../utils/date.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { DASH as EMPTY } from '../../utils/columns.util';

type Props = { product: IProduct };

const ProductExpandedRow: React.FC<Props> = ({ product }) => {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  const created =
    asDateLoose((product as any).createdAt) ||
    asDateLoose(product.metadata?.createdAt as any);
  const updated =
    asDateLoose((product as any).updatedAt) ||
    asDateLoose(product.metadata?.updatedAt as any);

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
      gap={2}
    >
      <Box>
        <Typography variant="subtitle2">
          {t('product.details.pricing', { defaultValue: 'Pricing / Stock' })}
        </Typography>
        <Typography variant="body2">
          {t('product.details.price', { defaultValue: 'Price' })}:{' '}
          {formatCurrency(product.price ?? 0)}
        </Typography>
        <Typography variant="body2">
          {t('product.details.stock', { defaultValue: 'Stock' })}:{' '}
          {product.stock ?? 0}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('product.details.created', { defaultValue: 'Created' })}
        </Typography>
        <Typography variant="body2">
          {created ? formatDateTime(created) : EMPTY}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('product.details.updated', { defaultValue: 'Updated' })}
        </Typography>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : EMPTY}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProductExpandedRow;
