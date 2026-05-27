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

type FormInputs = { email: string };

export default function ResetPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInputs>();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // src/pages/ResetPasswordPage.tsx  (only the onSubmit body changes)
  const onSubmit = async ({ email }: FormInputs) => {
    setSuccessMessage('');
    setErrorMessage('');

    const normalizedEmail = email.trim().replace(/\s+/g, '').toLowerCase();

    try {
      // Hosted UI flow: after the user clicks "Save" → Firebase redirects to /login
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false, // IMPORTANT: hosted page, not in-app
      };

      await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings);
      setSuccessMessage(
        `Password reset email sent to ${normalizedEmail}. Please check your inbox (and Spam).`,
      );
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const msg =
        code === 'auth/invalid-email'
          ? 'Invalid email address.'
          : code === 'auth/user-not-found'
            ? 'No user found with this email in this Firebase project.'
            : code === 'auth/too-many-requests'
              ? 'Too many attempts. Try again later.'
              : 'Failed to send reset email.';
      setErrorMessage(msg);
      console.error('[reset-password] error:', err);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      px={2}
    >
      <Paper
        elevation={6}
        sx={{ p: 4, maxWidth: 420, width: '100%', borderRadius: 3 }}
      >
        <Typography variant="h5" textAlign="center" gutterBottom>
          Reset Your Password
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          data-testid="reset-password-form"
        >
          <Stack spacing={3} mt={2}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              fullWidth
              inputProps={{ 'data-testid': 'reset-email' }}
              {...register('email', {
                required: 'Email is required',
                // allow spaces; we strip them before sending
                validate: (v) =>
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    v.trim().replace(/\s+/g, ''),
                  ) || 'Invalid email address',
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              data-testid="reset-submit"
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
