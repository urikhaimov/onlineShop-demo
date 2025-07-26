// src/pages/checkout/CheckoutPage.tsx
import React, { Suspense } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';
import { useCartStore } from '../../stores/useCartStore';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useStripeClientSecret } from '../../hooks/useStripeClientSecret';
import { stripePromise } from '../../stripe/StripeProvider';

const StripeProvider = React.lazy(() => import('../../stripe/StripeProvider'));

export default function CheckoutPage() {
  const { clientSecret, loading, error } = useStripeClientSecret();

  const cart = useCartStore((s) => s.items);
  const shipping = 5.99;
  const taxRate = 0.17;
  const discount = 3.0;
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * taxRate;
  const total = useCartStore.getState().getCartTotal({
    shipping,
    taxRate,
    discount: discount * 100,
  });

  return (
    <Suspense fallback={<CircularProgress />}>
      <StripeProvider>
        <Box
          sx={{
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            py: 4,
          }}
        >
          <Paper elevation={1} sx={{ p: 3, width: '100%', maxWidth: 480 }}>
            <Typography variant="h6" mb={2}>
              Checkout
            </Typography>

            <Stack spacing={1} mb={2}>
              <Typography>Subtotal: ${subtotal.toFixed(2)}</Typography>
              <Typography>Shipping: ${shipping.toFixed(2)}</Typography>
              <Typography>Tax (17%): ${tax.toFixed(2)}</Typography>
              <Typography>Discount: -${discount.toFixed(2)}</Typography>
              <Divider />
              <Typography fontWeight="bold">
                Total: ${(total / 100).toFixed(2)} USD
              </Typography>
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCheckoutForm />
              </Elements>
            ) : (
              <Typography color="error">
                Failed to load payment form. Please try again later.
              </Typography>
            )}
          </Paper>

          <Snackbar
            open={!!error}
            autoHideDuration={5000}
            onClose={() => {
              // TODO: Handle error close
              console.log('Error closed');
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </StripeProvider>
    </Suspense>
  );
}
