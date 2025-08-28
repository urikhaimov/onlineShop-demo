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

// ✅ Reusable container utils
import { contentBoxSx, getLayoutTokens } from '../../utils/uiLayout';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Brand/theme tokens
  const { themeSettings } = useThemeStore();
  const { radius, contentMax } = getLayoutTokens(themeSettings);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const isDark = themeSettings?.darkMode ?? theme.palette.mode === 'dark';
  const primaryMain = themeSettings?.primaryColor || theme.palette.primary.main;

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

  // page/body gutters (scale-aware)
  const gutters = {
    xs: 2 * spacingScale,
    sm: 3 * spacingScale,
    md: 4 * spacingScale,
  } as const;

  return (
    <PageLayout
      action={EAbilityActions.READ}
      subject={EAbilitySubjects.PRODUCT}
    >
      {/* ✅ Reusable outer container */}
      <Box sx={contentBoxSx(headerHeight, footerHeight)}>
        {/* Centered content using contentMax from tokens */}
        <Box
          sx={{
            maxWidth: contentMax,
            mx: 'auto',
            width: '100%',
            px: { xs: gutters.xs, sm: gutters.sm, md: gutters.md },
            py: { xs: gutters.xs, sm: gutters.sm, md: gutters.md },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: gutters.sm, md: gutters.md }}
            alignItems="flex-start"
          >
            {/* Left — Images (padded card) */}
            <Box flex={1} minWidth={0}>
              <Paper
                elevation={0}
                sx={{
                  p: {
                    xs: 1.25 * spacingScale,
                    sm: 1.5 * spacingScale,
                    md: 2 * spacingScale,
                  },
                  borderRadius: radius,
                  boxShadow: cardShadow,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <ImageGallery images={product.images || []} />
              </Paper>
            </Box>

            {/* Right — Details */}
            <Box flex={1} minWidth={0}>
              <Paper
                elevation={0}
                sx={{
                  p: {
                    xs: 1.75 * spacingScale,
                    sm: 2 * spacingScale,
                    md: 2.5 * spacingScale,
                  },
                  borderRadius: radius,
                  boxShadow: cardShadow,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Stack
                  spacing={{ xs: 1.25 * spacingScale, md: 1.5 * spacingScale }}
                >
                  <Typography variant="h4">{product.name}</Typography>

                  <Typography variant="h6" color="text.secondary">
                    ${price.toFixed(2)}
                  </Typography>

                  {/* Description (sanitized) */}
                  <Box
                    sx={{
                      '& p': { my: 1 },
                      '& ul, & ol': { my: 1.25, pl: 3 },
                      '& h1, & h2, & h3, & h4': { mt: 2, mb: 1 },
                      color: 'text.primary',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(product.description || ''),
                    }}
                  />

                  {/* Stock */}
                  <Typography>
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
                      backgroundColor: primaryMain,
                      color: '#fff',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: darken(primaryMain, 0.12),
                        boxShadow: 'none',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: (t) =>
                          t.palette.action.disabledBackground,
                        color: (t) => t.palette.action.disabled,
                      },
                      mt: 0.5 * spacingScale,
                    }}
                  >
                    Add to Cart
                  </Button>
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </Box>
      </Box>
    </PageLayout>
  );
}
