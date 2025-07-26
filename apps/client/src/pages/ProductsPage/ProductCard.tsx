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
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart(product);
    onAddToCart?.(); // trigger snackbar if provided
  };
  const formattedPrice = Number(product.price).toFixed(2);
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: 1,
        p: 1,
      }}
    >
      {/* ✅ Image with link */}
      <Box
        component={Link}
        to={`/product/${product.id}`}
        sx={{
          width: 80,
          height: 80,
          display: 'inline-block',
          borderRadius: 1,
          overflow: 'hidden',
          mx: { xs: 'auto', sm: 0 },
        }}
      >
        <Box
          component="img"
          src={
            product.images?.[0] || 'https://picsum.photos/seed/fallback/100/100'
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

      <CardContent
        sx={{
          flex: 1,
          textAlign: { xs: 'center', sm: 'left' },
          px: 1,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          component={Link}
          to={`/product/${product.id}`}
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {product.name}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          ${formattedPrice ?? 'N/A'} • Stock: {product?.stock ?? 'N/A'}
        </Typography>
      </CardContent>

      <CardActions
        sx={{
          justifyContent: { xs: 'center', sm: 'flex-end' },
          px: 1,
        }}
      >
        <Button
          variant="contained"
          size="small"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );
}
