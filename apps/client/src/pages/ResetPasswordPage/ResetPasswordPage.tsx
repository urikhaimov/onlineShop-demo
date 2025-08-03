import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';

type FormInputs = {
  email: string;
};

export default function ResetPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInputs>();

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (data: FormInputs) => {
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await sendPasswordResetEmail(auth, data.email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.RESET_PASSWORD}
    >
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        minWidth="100vw"
        px={2}
      >
        <Paper
          elevation={6}
          sx={{ p: 4, maxWidth: 400, width: '100%', borderRadius: 3 }}
        >
          <Typography variant="h5" textAlign="center" gutterBottom>
            Reset Your Password
          </Typography>

          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3} mt={2}>
              <TextField
                label="Email"
                fullWidth
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address',
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem' }}
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </PageLayout>
  );
}
