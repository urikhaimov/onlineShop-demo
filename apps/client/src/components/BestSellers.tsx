// src/components/BestSellers.tsx
import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import ProductCard from './ProductCard';
import LoadingProgress from './LoadingProgress';
import { useBestSellers } from '../hooks/useBestSellers';

interface BestSellersProps {
  variant?: 'compact' | 'detailed' | 'standard'; // adjust based on supported card variants
}

export default function BestSellers({
  variant = 'standard',
}: BestSellersProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useBestSellers();

  const allProducts = data?.pages.flatMap((page) => page.products) || [];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom textAlign="center">
        🛍️ Best Sellers
      </Typography>

      {isLoading && allProducts.length === 0 ? (
        <LoadingProgress />
      ) : allProducts.length === 0 ? (
        <Typography textAlign="center" mt={4} color="text.secondary">
          No best sellers found.
        </Typography>
      ) : (
        <>
          <Box
            display="grid"
            gridTemplateColumns={{
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            }}
            gap={3}
          >
            {allProducts.map((product) => (
              <Box key={product.id}>
                <ProductCard product={product} variant={variant} />
              </Box>
            ))}
          </Box>

          {hasNextPage && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Button
                variant="outlined"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
