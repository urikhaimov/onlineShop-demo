// src/pages/ProductsPage/ProductExpandedRow.tsx
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import type { IProduct } from '@common/types';
import ImageGallery from '../../components/ImageGallery';

type FirestoreLikeTs = {
  seconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
};
type MaybeMetaDates = {
  createdAt?: unknown;
  updatedAt?: unknown;
  metadata?: { createdAt?: unknown; updatedAt?: unknown };
};
type OptionalFields = {
  sku?: string;
  brand?: string;
  description?: string; // HTML
  attributes?: Record<string, unknown>;
};

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as FirestoreLikeTs;
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
    }
    if (
      'seconds' in (value as Record<string, unknown>) &&
      typeof v.seconds === 'number'
    ) {
      const ms =
        v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
  }
  return undefined;
}

type Props = {
  product: IProduct;
  categoryName?: string;
};

const ProductExpandedRow: React.FC<Props> = ({ product, categoryName }) => {
  const pWithMeta = product as unknown as MaybeMetaDates;
  const extras = product as unknown as OptionalFields;

  const images = Array.isArray(
    (product as unknown as { images?: string[] }).images,
  )
    ? ((product as unknown as { images?: string[] }).images as string[])
    : [];

  const created = asDate(pWithMeta.createdAt ?? pWithMeta.metadata?.createdAt);
  const updated = asDate(pWithMeta.updatedAt ?? pWithMeta.metadata?.updatedAt);

  const priceNum = Number(
    (product as unknown as { price?: unknown }).price ?? 0,
  );
  const stockNum = Number(
    (product as unknown as { stock?: unknown }).stock ?? 0,
  );

  const priceLabel = Number.isFinite(priceNum)
    ? `$${priceNum.toFixed(2)}`
    : '—';
  const stockLabel = Number.isFinite(stockNum) ? stockNum : ('—' as const);

  const sanitizedDescription = useMemo(
    () =>
      extras.description
        ? DOMPurify.sanitize(extras.description, {
            USE_PROFILES: { html: true },
          })
        : '',
    [extras.description],
  );

  return (
    <Box
      display="grid"
      gap={2}
      alignItems="start"
      gridTemplateColumns={{
        xs: '1fr', // phones
        sm: '1fr 1fr', // small tablets
        md: '300px 1fr 260px', // desktop: 3 columns
      }}
    >
      {/* Col 1: images */}
      <Box sx={{ minWidth: 0 }}>
        {images.length > 0 ? (
          <ImageGallery images={images} />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 160,
              bgcolor: 'action.hover',
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              typography: 'caption',
              color: 'text.secondary',
            }}
          >
            No images
          </Box>
        )}
      </Box>

      {/* Col 2: title, category, description */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {categoryName ?? '—'}
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Description
        </Typography>
        {sanitizedDescription ? (
          <Box
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            sx={{
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

        {/* Attributes (keep in middle so they can wrap nicely) */}
        {extras.attributes && Object.keys(extras.attributes).length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2">Attributes</Typography>
            <Box component="ul" sx={{ pl: 3, my: 0 }}>
              {Object.entries(extras.attributes).map(([k, v]) => (
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
      </Box>

      {/* Col 3: pricing/stock + dates */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">Pricing / Stock</Typography>
        <Typography variant="body2">Price: {priceLabel}</Typography>
        <Typography variant="body2">Stock: {stockLabel}</Typography>
        {extras.sku && (
          <Typography variant="body2">SKU: {extras.sku}</Typography>
        )}
        {extras.brand && (
          <Typography variant="body2">Brand: {extras.brand}</Typography>
        )}

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2">Created</Typography>
          <Typography variant="body2">
            {created ? format(created, 'PPpp') : '—'}
          </Typography>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Updated</Typography>
          <Typography variant="body2">
            {updated ? format(updated, 'PPpp') : '—'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductExpandedRow;
