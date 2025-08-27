// src/pages/ProductPage/index.tsx
import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { darken } from '@mui/material/styles';
import DOMPurify from 'dompurify';

import ImageGallery from '../../components/ImageGallery';
import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useProductById } from '../../hooks/useProductById';
import { headerHeight, footerHeight } from '../../config/themeConfig';
import LoadingProgress from '../../components/LoadingProgress';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 🧩 Theme store (brand + shape + scale)
  const { themeSettings } = useThemeStore();
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const primaryMain = themeSettings?.primaryColor || theme.palette.primary.main;

  // Derive spacing units once (kept simple to avoid Sx array types)
  const unit = Math.max(1, Math.round(2 * spacingScale));

  const addToCart = useCartStore((s) => s.addToCart);

  const {
    data: product,
    isLoading,
    error,
  } = useProductById(id ? decodeURIComponent(id) : undefined);

  if (isLoading) return <LoadingProgress />;

  if (error || !product) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">
          Product not found.
        </Typography>
      </Box>
    );
  }

  const stockCount =
    typeof product.stock === 'number'
      ? product.stock
      : Number(product.stock ?? 0);

  const price = Number(product.price || 0);

  // Dark/light tuned shadow
  const cardShadow = isDark ? theme.shadows[4] : theme.shadows[2];

  return (
    <PageLayout
      action={EAbilityActions.READ}
      subject={EAbilitySubjects.PRODUCT}
    >
      <Box
        sx={{
          height: `calc(100vh - ${headerHeight + footerHeight}px)`,
          overflowY: 'auto',
          px: { xs: 2, md: 3 * unit }, // scales with spacing
          py: { xs: 2, md: 2 * unit },
          mt: `${headerHeight}px`,
          mb: `${footerHeight}px`,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2 * unit}
          alignItems="flex-start"
        >
          {/* Left — Images */}
          <Box flex={1} minWidth={0}>
            <ImageGallery images={product.images || []} />
          </Box>

          {/* Right — Details */}
          <Box flex={1} minWidth={0}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2 * spacingScale, md: 3 * spacingScale },
                borderRadius: radius,
                boxShadow: cardShadow,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography variant="h4" gutterBottom>
                {product.name}
              </Typography>

              <Typography variant="h6" color="text.secondary" gutterBottom>
                ${price.toFixed(2)}
              </Typography>

              {/* Description (sanitized) */}
              <Box
                sx={{ mb: 2 * spacingScale }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(product.description || ''),
                }}
              />

              {/* Stock */}
              <Typography sx={{ mb: spacingScale }}>
                Stock:{' '}
                {stockCount > 0 ? (
                  stockCount < 5 ? (
                    <Box
                      component="span"
                      sx={{ color: 'warning.main', fontWeight: 600 }}
                    >
                      {stockCount} left
                    </Box>
                  ) : (
                    <Box
                      component="span"
                      sx={{ color: 'success.main', fontWeight: 600 }}
                    >
                      {stockCount}
                    </Box>
                  )
                ) : (
                  <Box
                    component="span"
                    sx={{ color: 'error.main', fontWeight: 600 }}
                  >
                    Out of stock
                  </Box>
                )}
              </Typography>

              {/* CTA */}
              <Button
                variant="contained"
                fullWidth={isMobile}
                disableElevation
                disabled={stockCount <= 0}
                onClick={() => addToCart(product)}
                sx={{
                  height: 44,
                  borderRadius: radius,
                  // brand color from store; keep hover cohesive
                  backgroundColor: primaryMain,
                  color: '#fff',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: darken(primaryMain, 0.12),
                    boxShadow: 'none',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: (t) => t.palette.action.disabledBackground,
                    color: (t) => t.palette.action.disabled,
                  },
                  mt: spacingScale,
                }}
              >
                Add to Cart
              </Button>
            </Paper>
          </Box>
        </Stack>
      </Box>
    </PageLayout>
  );
}
