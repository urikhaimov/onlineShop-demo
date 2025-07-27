import React, { useReducer } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import FormTextField from '../../components/FormTextField';
import { reducer, initialState } from './StripeFormReducer';

type FormData = {
  ownerName: string;
  passportId: string;
};

export default function StripeCheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const [state, dispatch] = useReducer(reducer, initialState);
  const { loading, error } = state;

  const onSubmit = async (data: FormData) => {
    if (!stripe || !elements) {
      dispatch({ type: 'SET_ERROR', payload: 'Stripe is not ready yet' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: data.ownerName,
              },
            },
          },
          // No redirect, handle in-app instead
          redirect: 'if_required',
        },
      );

      dispatch({ type: 'SET_LOADING', payload: false });

      if (stripeError) {
        console.error('❌ Payment failed:', stripeError);
        dispatch({
          type: 'SET_ERROR',
          payload: stripeError.message || 'Payment failed',
        });
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        navigate('/thank-you'); // ✅ local confirmation page
      } else {
        console.warn('PaymentIntent status:', paymentIntent?.status);
        dispatch({
          type: 'SET_ERROR',
          payload: `Payment status: ${paymentIntent?.status}`,
        });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.error('Unexpected error confirming payment:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: err.message || 'Unexpected error',
      });
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Payment Details
      </Typography>

      <FormTextField
        label="Owner Name"
        register={register('ownerName', {
          required: 'Owner name is required',
        })}
        errorObject={errors.ownerName}
      />

      <FormTextField
        label="Passport ID"
        register={register('passportId', {
          required: 'Passport ID is required',
        })}
        errorObject={errors.passportId}
      />

      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <PaymentElement />
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!stripe || loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Pay Now'}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
