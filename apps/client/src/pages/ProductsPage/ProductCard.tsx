import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { darken } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { useThemeStore } from '../../stores/useThemeStore';
import type { Props } from './CardReducer';

type ProductCardProps = Props & { onAddToCart?: () => void };

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { themeSettings } = useThemeStore();

  const primaryColor = themeSettings?.primaryColor || '#1976d2';
  const borderRadius = themeSettings?.borderRadius ?? 8;
  const spacingScale = themeSettings?.spacingScale ?? 1;

  const minHeight = { xs: 320, sm: 340, md: 360, lg: 380, xl: 400 };

  const price =
    typeof product.price === 'number'
      ? product.price.toFixed(2)
      : Number(product.price ?? 0).toFixed(2);
  const stock = typeof product.stock === 'number' ? product.stock : 0;

  const handleAddToCart = () => {
    addToCart(product);
    onAddToCart?.();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0, // ← prevent overflow in grid cell
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 1.25 * spacingScale,
        borderRadius,
        boxShadow: 1,
        height: '100%',
        minHeight,
        textAlign: 'center',
      }}
    >
      {/* Square image */}
      <Box
        component={Link}
        to={`/product/${product.id}`}
        sx={{
          display: 'block',
          width: '100%',
          maxWidth: { xs: 220, sm: 240, md: 260, lg: 280, xl: 300 },
          mx: 'auto',
          mb: 1.25 * spacingScale,
          borderRadius: 2,
          overflow: 'hidden',
          aspectRatio: '1 / 1',
        }}
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
          }}
        />
      </Box>

      <CardContent
        sx={{ flex: '1 1 auto', width: '100%', px: 1, py: 0.5, minWidth: 0 }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          component={Link}
          to={`/product/${product.id}`}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textDecoration: 'none',
            color: 'inherit',
            minHeight: 44,
          }}
        >
          {product.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ${price} • Stock: {Number.isFinite(stock) ? stock : 'N/A'}
        </Typography>
      </CardContent>

      <CardActions sx={{ width: '100%', pb: 1 }}>
        <Button
          size="small"
          onClick={handleAddToCart}
          disabled={stock <= 0}
          fullWidth
          disableElevation
          sx={{
            height: 38,
            backgroundColor: primaryColor,
            color: '#fff',
            '&:hover': { backgroundColor: darken(primaryColor, 0.12) },
            '&.Mui-disabled': { backgroundColor: 'action.disabledBackground' },
            borderRadius,
          }}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );
}
