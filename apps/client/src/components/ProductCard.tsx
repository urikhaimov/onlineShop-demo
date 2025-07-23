// src/components/ProductCard.tsx
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { IProduct } from '@common/types';

type Props = {
  product: IProduct;
  variant?: 'compact' | 'detailed' | 'standard';
  onAddToCart?: () => void;
};

export default function ProductCard({
  product,
  variant = 'standard',
  onAddToCart,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const formattedPrice = Number(product.price).toFixed(2);

  const cardSx = {
    display: 'flex',
    flexDirection:
      variant === 'detailed' ? { xs: 'column', sm: 'row' } : 'column',
    height: variant === 'detailed' ? { xs: 'auto', sm: 200 } : '100%',
    p: variant === 'compact' ? 1 : 2,
    border:
      variant === 'compact' ? `1px solid ${theme.palette.divider}` : undefined,
  };

  const mediaSx = {
    objectFit: 'cover',
    width: variant === 'detailed' ? { xs: '100%', sm: 200 } : '100%',
    height: variant === 'detailed' ? { xs: 180, sm: '100%' } : 180,
    borderRadius: 1,
  };

  return (
    <Card sx={cardSx}>
      {product.imageUrl && product.images && (
        <CardMedia
          component="img"
          image={
            product.images.length > 0 ? product.images[0] : product.imageUrl
          }
          alt={product.name}
          sx={mediaSx}
        />
      )}

      <Box
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        flex={1}
        px={variant === 'detailed' ? 2 : 0}
        py={1}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ${formattedPrice}
          </Typography>
        </CardContent>

        {onAddToCart && (
          <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth={isMobile}
              onClick={onAddToCart}
            >
              Add to Cart
            </Button>
          </CardActions>
        )}
      </Box>
    </Card>
  );
}
