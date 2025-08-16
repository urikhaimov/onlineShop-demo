import React from 'react';
import { Box, Typography, CardMedia } from '@mui/material';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
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

  const created =
    asDate((product as any)?.createdAt) ??
    asDate((product as any)?.metadata?.createdAt);
  const updated =
    asDate((product as any)?.updatedAt) ??
    asDate((product as any)?.metadata?.updatedAt);

  // Optional fields coming from your editor / schema
  const sku = (product as any)?.sku as string | undefined;
  const brand = (product as any)?.brand as string | undefined;
  const description = (product as any)?.description as string | undefined; // HTML string
  const attributes = (product as any)?.attributes as
    | Record<string, unknown>
    | undefined;

  const sanitizedDescription = description
    ? DOMPurify.sanitize(description, { USE_PROFILES: { html: true } })
    : '';

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
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Description
        </Typography>

        {sanitizedDescription ? (
          <Box
            // Render sanitized HTML
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            sx={{
              // Basic typography for editor HTML
              '& p': {
                m: 0,
                mb: 0.5,
                fontSize: '0.875rem',
                color: 'text.primary',
              },
              '& ul, & ol': { my: 0.5, pl: 3 },
              '& li': { fontSize: '0.875rem' },
              '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 1, mb: 0.5 },
              '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
              '& a': { color: 'primary.main', textDecoration: 'underline' },
            }}
          />
        ) : (
          <Typography variant="body2">—</Typography>
        )}
      </Box>

      {attributes && Object.keys(attributes).length > 0 && (
        <Box gridColumn={{ xs: '1', sm: '1 / span 2' }}>
          <Typography variant="subtitle2">Attributes</Typography>
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {Object.entries(attributes).map(([k, v]) => (
              <li key={k}>
                <Typography variant="body2">
                  <strong>{k}:</strong>{' '}
                  {typeof v === 'object' && v !== null
                    ? JSON.stringify(v)
                    : String(v)}
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
