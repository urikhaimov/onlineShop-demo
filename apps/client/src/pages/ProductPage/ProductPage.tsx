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
import { useCartStore } from '../../stores/useCartStore';
import DOMPurify from 'dompurify';
import ImageGallery from '../../components/ImageGallery';
import { useProductById } from '../../hooks/useProductById';
import { headerHeight, footerHeight } from '../../config/themeConfig';
import LoadingProgress from '../../components/LoadingProgress';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const addToCart = useCartStore((state) => state.addToCart);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    data: product,
    isLoading,
    error,
  } = useProductById(id ? decodeURIComponent(id) : undefined);

  if (isLoading) {
    return <LoadingProgress />;
  }

  if (error || !product) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">
          Product not found.
        </Typography>
      </Box>
    );
  }

  return (
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
          <Paper elevation={3} sx={{ p: 3 }}>
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
              Stock: {product.stock > 0 ? product.stock : 'Out of stock'}
            </Typography>

            <Button
              variant="contained"
              disabled={product.stock <= 0}
              onClick={() =>
                addToCart({
                  ...product,
                  createdAt: product.createdAt.toISOString(),
                  updatedAt: product.updatedAt.toISOString(),
                })
              }
              fullWidth={isMobile}
            >
              Add to Cart
            </Button>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
