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

  // Ensure we actually get blue unless you override it in the store
  const primaryColor = themeSettings?.primaryColor || '#1976d2';
  const borderRadius = themeSettings?.borderRadius ?? 8;
  const spacingScale = themeSettings?.spacingScale ?? 1;

  // Bigger square image; same across all cards
  const imgSize = { xs: 140, sm: 160, md: 180, lg: 200, xl: 220 };
  const minHeight = { xs: 310, sm: 330, md: 360, lg: 380, xl: 400 };

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
      {/* Square image — slightly rounded, NOT circular */}
      <Box
        component={Link}
        to={`/product/${product.id}`}
        sx={{
          borderRadius: 2, // small radius only
          overflow: 'hidden', // keep corners crisp
          width: imgSize,
          height: imgSize,
          mb: 1.25 * spacingScale,
          display: 'block',
        }}
      >
        <Box
          component="img"
          src={
            product.images?.[0] || 'https://picsum.photos/seed/fallback/200/200'
          }
          alt={product.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: 0, // ensure not circular if global CSS exists
          }}
        />
      </Box>

      <CardContent sx={{ flex: '1 1 auto', width: '100%', px: 1, py: 0.5 }}>
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
            // Force true blue regardless of theme palette conflicts
            backgroundColor: `${primaryColor} !important`,
            color: '#fff',
            '&:hover': {
              backgroundColor: `${darken(primaryColor, 0.32)} !important`,
            },
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
