import React from 'react';
import { Box, Typography, CardMedia } from '@mui/material';
import { format } from 'date-fns';
import type { IProduct } from '@common/types';

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds?: number };
    return new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
  }
  return undefined;
}

type Props = {
  product: IProduct;
  categoryName?: string;
};

const ProductExpandedRow: React.FC<Props> = ({ product, categoryName }) => {
  const img =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : undefined;

  const created = asDate((product as any)?.createdAt); // if you store createdAt on the product
  const updated = asDate((product as any)?.updatedAt);

  // Optional/guessy fields — rendered defensively
  const sku = (product as any)?.sku as string | undefined;
  const brand = (product as any)?.brand as string | undefined;
  const description = (product as any)?.description as string | undefined;
  const attributes = (product as any)?.attributes as
    | Record<string, unknown>
    | undefined;

  return (
    <Box
      display="grid"
      gap={1.5}
      gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
    >
      <Box display="flex" gap={1.5} alignItems="flex-start">
        {img && (
          <CardMedia
            component="img"
            image={img}
            alt={product.name}
            sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }}
          />
        )}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {categoryName ?? '—'}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2">Pricing / Stock</Typography>
        <Typography variant="body2">
          Price:{' '}
          {typeof product.price === 'number'
            ? `$${product.price.toFixed(2)}`
            : '—'}
        </Typography>
        <Typography variant="body2">
          Stock: {typeof product.stock === 'number' ? product.stock : '—'}
        </Typography>
        {sku && <Typography variant="body2">SKU: {sku}</Typography>}
        {brand && <Typography variant="body2">Brand: {brand}</Typography>}
      </Box>

      <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
        <Typography variant="subtitle2">Description</Typography>
        <Typography variant="body2">{description ?? '—'}</Typography>
      </Box>

      {attributes && Object.keys(attributes).length > 0 && (
        <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
          <Typography variant="subtitle2">Attributes</Typography>
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {Object.entries(attributes).map(([k, v]) => (
              <li key={k}>
                <Typography variant="body2">
                  <strong>{k}:</strong> {String(v)}
                </Typography>
              </li>
            ))}
          </Box>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2">Created</Typography>
        <Typography variant="body2">
          {created ? format(created, 'PPpp') : '—'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2">Updated</Typography>
        <Typography variant="body2">
          {updated ? format(updated, 'PPpp') : '—'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProductExpandedRow;
