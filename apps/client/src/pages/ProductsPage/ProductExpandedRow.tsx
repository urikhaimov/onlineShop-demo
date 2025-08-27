// src/pages/ProductsPage/ProductExpandedRow.tsx
import React, { useMemo } from 'react';
import { Box, Typography, CardMedia, useTheme } from '@mui/material';
import DOMPurify from 'dompurify';
import type { IProduct } from '@common/types';
import { useTranslation } from 'react-i18next';

import { DASH, asDate } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

type Props = {
  product: IProduct;
  categoryName?: string;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const ProductExpandedRow: React.FC<Props> = ({ product, categoryName }) => {
  const { t, i18n } = useTranslation();
  const mui = useTheme();
  const { themeSettings } = useThemeStore();

  // Theme-aware controls (same rhythm as OrderExpandedRow)
  const isDark =
    themeSettings?.darkMode ?? (mui.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const baseRadius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);
  const radius = clamp(baseRadius, 6, 16);

  // Grid gap
  const unit = Math.max(1, Math.round(2 * spacingScale));
  const gap = mui.spacing(unit);

  // Section inner padding
  const sectionPadX = {
    xs: mui.spacing(1.25 * spacingScale),
    sm: mui.spacing(1.5 * spacingScale),
  };
  const sectionPadY = {
    xs: mui.spacing(1 * spacingScale),
    sm: mui.spacing(1.25 * spacingScale),
  };

  // Section outer margin
  const sectionMarginX = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(1 * spacingScale),
  };
  const sectionMarginY = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(1 * spacingScale),
  };

  const sectionBorder = `1px solid ${mui.palette.divider}`;
  const sectionShadow = isDark ? mui.shadows[2] : mui.shadows[1];

  // Locale-aware formatters
  const { formatCurrency, formatDateTime } = useLocaleFormatters(
    i18n.resolvedLanguage || i18n.language,
    'USD',
  );

  // Data mapping
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

  const sku = (product as any)?.sku as string | undefined;
  const brand = (product as any)?.brand as string | undefined;
  const description = (product as any)?.description as string | undefined; // HTML
  const attributes = (product as any)?.attributes as
    | Record<string, unknown>
    | undefined;

  const sanitizedDescription = useMemo(
    () =>
      description
        ? DOMPurify.sanitize(description, { USE_PROFILES: { html: true } })
        : '',
    [description],
  );

  const priceLabel =
    typeof product.price === 'number' ? formatCurrency(product.price) : DASH;
  const stockLabel =
    typeof product.stock === 'number' ? String(product.stock) : DASH;

  const hasAttributes = attributes && Object.keys(attributes).length > 0;

  // Reusable Section (inner padding + outer margins)
  const Section: React.FC<
    React.PropsWithChildren<{ title: React.ReactNode; gridSpan?: any }>
  > = ({ title, gridSpan, children }) => (
    <Box
      sx={{
        gridColumn: gridSpan,
        // outer
        mx: sectionMarginX,
        my: sectionMarginY,
        // inner
        px: sectionPadX,
        py: sectionPadY,

        bgcolor: 'background.paper',
        border: sectionBorder,
        boxShadow: sectionShadow,

        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        wordBreak: 'break-word',
        '& *': { minWidth: 0 },
      }}
    >
      <Typography variant="subtitle2">{title}</Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gap,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Overview */}
      <Section
        title={t('productDetails.overview', { defaultValue: 'Overview' })}
      >
        <Box display="flex" gap={1.5} alignItems="flex-start">
          {img && (
            <CardMedia
              component="img"
              image={img}
              alt={product.name}
              sx={{
                width: 72,
                height: 72,
                objectFit: 'cover',
                borderRadius: 1.5,
                flexShrink: 0,
              }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {product.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {categoryName ?? DASH}
            </Typography>
          </Box>
        </Box>
      </Section>

      {/* Pricing & Stock */}
      <Section
        title={t('productDetails.pricingStock', {
          defaultValue: 'Pricing & Stock',
        })}
      >
        <Typography variant="body2">
          {t('productDetails.price', { defaultValue: 'Price' })}: {priceLabel}
        </Typography>
        <Typography variant="body2">
          {t('productDetails.stock', { defaultValue: 'Stock' })}: {stockLabel}
        </Typography>
        {sku && (
          <Typography variant="body2">
            {t('productDetails.sku', { defaultValue: 'SKU' })}: {sku}
          </Typography>
        )}
        {brand && (
          <Typography variant="body2">
            {t('productDetails.brand', { defaultValue: 'Brand' })}: {brand}
          </Typography>
        )}
      </Section>

      {/* Description (spans two) */}
      <Section
        title={t('productDetails.description', {
          defaultValue: 'Description',
        })}
        gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
      >
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
          <Typography variant="body2">{DASH}</Typography>
        )}
      </Section>

      {/* Attributes (optional, spans two) */}
      {hasAttributes && (
        <Section
          title={t('productDetails.attributes', {
            defaultValue: 'Attributes',
          })}
          gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
        >
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {Object.entries(attributes!).map(([k, v]) => (
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
        </Section>
      )}

      {/* Created / Updated */}
      <Section title={t('productDetails.created', { defaultValue: 'Created' })}>
        <Typography variant="body2">
          {created ? formatDateTime(created) : DASH}
        </Typography>
      </Section>

      <Section title={t('productDetails.updated', { defaultValue: 'Updated' })}>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : DASH}
        </Typography>
      </Section>
    </Box>
  );
};

export default ProductExpandedRow;
