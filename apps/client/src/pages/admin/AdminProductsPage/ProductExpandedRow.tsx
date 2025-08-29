// src/pages/ProductsPage/ProductExpandedRow.tsx
import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { IProduct } from '@common/types';
import { useTranslation } from 'react-i18next';
import { asDateLoose } from '../../../utils/date.util'; // ← note path
import { useLocaleFormatters } from '../../../hooks/useLocale'; // ← note path

type Props = {
  product: IProduct;
  categoryName?: string;
};

const ProductExpandedRow: React.FC<Props> = ({ product, categoryName }) => {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  // Robust date resolution (top-level or metadata, various shapes)
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
      {/* Pricing / stock (and optional category label if provided) */}
      <Box>
        <Typography variant="subtitle2">
          {t('product.details.pricing', { defaultValue: 'Pricing / Stock' })}
        </Typography>
        {categoryName && (
          <Typography variant="body2">
            {t('product.details.category', { defaultValue: 'Category' })}:{' '}
            {categoryName}
          </Typography>
        )}
        <Typography variant="body2">
          {t('product.details.price', { defaultValue: 'Price' })}:{' '}
          {formatCurrency(Number(product.price ?? 0))}
        </Typography>
        <Typography variant="body2">
          {t('product.details.stock', { defaultValue: 'Stock' })}:{' '}
          {Number(product.stock ?? 0)}
        </Typography>
      </Box>

      {/* Created / Updated */}
      <Box>
        <Typography variant="subtitle2">
          {t('product.details.created', { defaultValue: 'Created' })}
        </Typography>
        <Typography variant="body2">
          {created ? formatDateTime(created) : ''}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2">
          {t('product.details.updated', { defaultValue: 'Updated' })}
        </Typography>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProductExpandedRow;
