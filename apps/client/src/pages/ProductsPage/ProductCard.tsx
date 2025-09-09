// src/components/products/ProductCard.tsx
import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, darken } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';
import type { Props } from './CardReducer';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { DASH } from '../../utils/columns.util';

type ProductCardProps = Props & { onAddToCart?: () => void };

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();

  // ---- Theme-aware tokens
  const isDark = themeSettings?.darkMode ?? theme.palette.mode === 'dark';
  const primaryColor =
    themeSettings?.primaryColor || theme.palette.primary.main;
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);

  // Safe, scalar spacing
  const pad = 1.25 * spacingScale;
  const gapY = 0.75 * spacingScale;

  // Card surface + outline that work with CSS vars and non-vars
  const paperBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 1)`
    : theme.palette.background.paper;

  const outline =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.22 : 0.12);

  const hoverOutline =
    theme.vars?.palette?.divider ?? alpha(primaryColor, isDark ? 0.35 : 0.25);

  const baseShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const hoverShadow = isDark ? theme.shadows[6] : theme.shadows[3];

  // ---- Product fields
  const rawPrice = product.price;
  const priceLabel = Number.isFinite(rawPrice)
    ? formatCurrency(rawPrice)
    : DASH;

  const stockVal = product.stock;
  const stockLabel = String(stockVal);

  const disabled = (stockVal ?? 0) <= 0;

  const handleAddToCart = () => {
    addToCart(product);
    onAddToCart?.();
  };

  return (
    <Card
      data-testid="product-card"
      variant="outlined"
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        height: '100%',
        minHeight: { xs: 320, sm: 340, md: 360, lg: 380, xl: 400 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: radius,
        p: pad,
        bgcolor: paperBg,
        borderColor: outline,
        boxShadow: baseShadow,
        transition:
          'box-shadow .25s ease, border-color .25s ease, transform .2s ease',
        '&:hover': {
          boxShadow: hoverShadow,
          borderColor: hoverOutline,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Media (square) */}
      <Box
        component={Link}
        to={`/product/${product.id}`}
        sx={{
          display: 'block',
          width: '100%',
          maxWidth: { xs: 220, sm: 240, md: 260, lg: 280, xl: 300 },
          mx: 'auto',
          mb: gapY,
          borderRadius: Math.max(8, radius - 2),
          overflow: 'hidden',
          aspectRatio: '1 / 1',
        }}
        aria-label={product.name}
      >
        <Box
          component="img"
          src={
            product.images?.[0] || 'https://picsum.photos/seed/fallback/600/600'
          }
          alt={product.name}
          loading="lazy"
          decoding="async"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            backgroundColor: theme.palette.action.hover,
          }}
        />
      </Box>

      {/* Content */}
      <CardContent
        sx={{
          flex: '1 1 auto',
          width: '100%',
          px: 1,
          py: gapY * 0.66,
          minWidth: 0,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          component={Link}
          to={`/product/${product.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: 44,
          }}
          title={product.name}
        >
          {product.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5 * spacingScale,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {priceLabel} • {t('table.stock', { defaultValue: 'Stock' })}:{' '}
          {stockLabel}
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ width: '100%', pb: gapY * 0.8 }}>
        <Button
          data-testid="add-to-cart"
          aria-label={t('table.addToCart', { defaultValue: 'Add to Cart' })}
          size="small"
          onClick={handleAddToCart}
          disabled={disabled}
          fullWidth
          disableElevation
          sx={{
            height: 38,
            borderRadius: Math.max(8, radius - 2),
            backgroundColor: disabled
              ? theme.palette.action.disabledBackground
              : primaryColor,
            color: disabled ? theme.palette.action.disabled : '#fff',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:hover': {
              backgroundColor: disabled
                ? theme.palette.action.disabledBackground
                : darken(primaryColor, 0.12),
              boxShadow: 'none',
              backgroundImage: 'none',
            },
          }}
        >
          {disabled
            ? t('table.outOfStock', { defaultValue: 'Out of stock' })
            : t('table.addToCart', { defaultValue: 'Add to Cart' })}
        </Button>
      </CardActions>
    </Card>
  );
}
