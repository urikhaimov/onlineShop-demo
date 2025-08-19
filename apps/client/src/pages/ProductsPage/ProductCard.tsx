import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import type { Props } from './CardReducer';

type ProductCardProps = Props & {
  onAddToCart?: () => void;
};

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const addToCart = useCartStore((s) => s.addToCart);

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
        p: 1.25,
        borderRadius: 2,
        boxShadow: 1,
        height: '100%',
        textAlign: 'center',
      }}
    >
      {/* Responsive square image — larger on big screens */}
      <Box
        component={Link}
        to={`/product/${product.id}`}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          width: { xs: 88, sm: 96, md: 120, lg: 136, xl: 152 },
          height: { xs: 88, sm: 96, md: 120, lg: 136, xl: 152 },
          mb: 1.25,
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
          }}
        />
      </Box>

      <CardContent sx={{ flex: '1 1 auto', width: '100%', px: 1, py: 0.5 }}>
        {/* Clamp to 2 lines so row heights stay tidy */}
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

      <CardActions sx={{ justifyContent: 'center', width: '100%', pb: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleAddToCart}
          disabled={stock <= 0}
          sx={{ minWidth: 120 }}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );
}
