// src/components/ProductCard.tsx
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
  useTheme,
} from '@mui/material';
import { IProduct } from '@common/types';

type Props = {
  product: IProduct;
  variant?: 'compact' | 'detailed' | 'standard';
};

export default function ProductCard({ product, variant = 'standard' }: Props) {
  const theme = useTheme();
  const formattedPrice = Number(product.price).toFixed(2);

  const cardSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    ...(variant === 'compact' && {
      p: 1,
      border: `1px solid ${theme.palette.divider}`,
    }),
    ...(variant === 'detailed' && {
      flexDirection: 'row' as const,
      height: 200,
    }),
  };

  const mediaProps =
    variant === 'detailed'
      ? { width: 200, height: '100%' }
      : { height: 180 };

  return (
    <Card sx={cardSx}>
      {product.imageUrl && product.images && (
        <CardMedia
          component="img"
          image={product.images.length > 0 ? product.images[0] : product.imageUrl}
          alt={product.name}
          sx={{
            objectFit: 'cover',
            ...mediaProps,
          }}
        />
      )}

      <CardContent
        sx={{
          flexGrow: 1,
          ...(variant === 'detailed' && { px: 2 }),
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ${formattedPrice}
        </Typography>
      </CardContent>

      <CardActions
        sx={{
          px: 2,
          pt: 0,
          pb: 2,
          ...(variant === 'detailed' && { flexDirection: 'column', alignItems: 'start' }),
        }}
      >
        <Button size="small" variant="outlined" fullWidth>
          View
        </Button>
      </CardActions>
    </Card>
  );
}
