// src/pages/ProductPage/index.tsx
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
import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';
import DOMPurify from 'dompurify';
import ImageGallery from '../../components/ImageGallery';
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
  const addToCart = useCartStore((state) => state.addToCart);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { themeSettings } = useThemeStore();
  const primaryColor = themeSettings?.primaryColor || '#1976d2';
  const borderRadius = themeSettings?.borderRadius ?? 8;

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

  // Now product is defined — safe to derive values
  const stockCount =
    typeof product.stock === 'number'
      ? product.stock
      : Number(product.stock ?? 0);

  return (
    <PageLayout
      action={EAbilityActions.READ}
      subject={EAbilitySubjects.PRODUCT}
    >
      <Box
        sx={{
          height: `calc(100vh - ${headerHeight + footerHeight}px)`,
          overflowY: 'auto',
          px: { xs: 2, md: 6 },
          py: { xs: 2, md: 4 },
          mt: `${headerHeight}px`,
          mb: `${footerHeight}px`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          alignItems="flex-start"
        >
          {/* Left - Images */}
          <Box flex={1} minWidth={0}>
            <ImageGallery images={product.images || []} />
          </Box>

          {/* Right - Product info */}
          <Box flex={1} minWidth={0}>
            <Paper elevation={3} sx={{ p: 3, borderRadius }}>
              <Typography variant="h4" gutterBottom>
                {product.name}
              </Typography>

              <Typography variant="h6" color="text.secondary" gutterBottom>
                ${Number(product.price || 0).toFixed(2)}
              </Typography>

              <Box
                sx={{ mb: 2 }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(product.description || ''),
                }}
              />

              <Typography sx={{ mb: 1 }}>
                Stock: {stockCount > 0 ? stockCount : 'Out of stock'}
              </Typography>

              <Button
                variant="outlined"
                fullWidth={isMobile}
                disableElevation
                disabled={stockCount <= 0}
                onClick={() =>
                  addToCart({
                    ...product,
                    // defensively stringify dates if needed
                    createdAt:
                      (product as any)?.createdAt?.toISOString?.() ??
                      new Date().toISOString(),
                    updatedAt:
                      (product as any)?.updatedAt?.toISOString?.() ??
                      new Date().toISOString(),
                  })
                }
                sx={{
                  height: 44,
                  borderRadius,
                  // Force primary color; override any global gradient
                  background: `${primaryColor} !important`,
                  backgroundImage: 'none !important',
                  color: '#fff',
                  boxShadow: 'none',
                  '&:hover': {
                    background: `${darken(primaryColor, 0.12)} !important`,
                    backgroundImage: 'none !important',
                    boxShadow: 'none',
                  },
                  '&.Mui-disabled': {
                    background: (t) =>
                      `${t.palette.action.disabledBackground} !important`,
                    color: (t) => t.palette.action.disabled,
                  },
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
