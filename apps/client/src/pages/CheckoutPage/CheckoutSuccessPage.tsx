import React from 'react';
import { Box, Typography, Button, Stack, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useConfirmOrder } from '../../hooks/useConfirmOrder';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();

  const { loading, error, toastOpen, setToastOpen } = useConfirmOrder();

  return (
    <Box
      minHeight="calc(100vh - 64px - 56px)" // adjust for your header/footer if needed
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={4}
    >
      <Stack spacing={3} alignItems="center" textAlign="center" maxWidth={480}>
        <Typography variant="h4" fontWeight={600}>
          🎉 Thank You for Your Order!
        </Typography>
        <Typography color="text.secondary">
          We’ve received your payment and your order is being processed.
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
          <Button variant="outlined" onClick={() => navigate('/my-orders')}>
            View My Orders
          </Button>
        </Stack>

        {loading && (
          <Typography variant="body2" color="text.secondary">
            Processing order...
          </Typography>
        )}
      </Stack>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {error || 'Something went wrong during order confirmation.'}
        </Alert>
      </Snackbar>
    </Box>
  );
}
