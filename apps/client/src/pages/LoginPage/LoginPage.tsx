// src/pages/LoginPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Google, Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useRedirect } from '../../context/RedirectContext';
import type { LoginFormData } from '../../services/schemas/auth.schema';
import { signInWithGoogleOrLink } from '../../auth/auth-google';

type LoginFormInputs = { email: string; password: string };

const LoginPage = () => {
  const { signInWithEmail, user } = useAuth();
  const { redirectTo, setMessage, message } = useRedirect();
  const navigate = useNavigate();
  const location = useLocation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<LoginFormInputs>();

  // Focus email on mount
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  // If already logged in, bounce to previous target or home
  useEffect(() => {
    if (user) {
      const fallback = '/';
      const fromState = (location.state as any)?.from as string | undefined;
      navigate(fromState || redirectTo || fallback, { replace: true });
    }
  }, [user, redirectTo, location.state, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signInWithEmail(data);
    } catch {
      setMessage('Invalid email or password');
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      minWidth="100vw"
      px={2}
      sx={{ backgroundColor: (t) => t.palette.background.default }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Paper
          elevation={6}
          sx={{
            p: isMobile ? 3 : 5,
            width: isMobile ? 320 : 400,
            borderRadius: 3,
          }}
        >
          <Box textAlign="center" mb={2}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              My Online Store
            </Typography>
            <Typography variant="h6">Welcome back</Typography>
          </Box>

          {message && (
            <Typography
              variant="body2"
              color="error"
              textAlign="center"
              mb={2}
              data-testid="login-error"
            >
              {message}
            </Typography>
          )}

          <form onSubmit={handleSubmit(onSubmit)} data-testid="login-form">
            <Stack spacing={3}>
              <TextField
                label="Email"
                fullWidth
                inputRef={emailRef}
                autoFocus
                inputProps={{ 'data-testid': 'login-email' }}
                {...register('email', { required: 'Email is required' })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                inputProps={{ 'data-testid': 'login-password' }}
                {...register('password', { required: 'Password is required' })}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((p) => !p)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting}
                data-testid="login-submit"
                sx={{ py: 1.5, fontWeight: 600 }}
              >
                {isSubmitting ? 'Logging in...' : 'Log in'}
              </Button>

              <Typography
                component={RouterLink}
                to="/reset-password"
                variant="body2"
                color="primary"
                textAlign="right"
                sx={{ textDecoration: 'none', mt: -1 }}
              >
                Forgot password?
              </Typography>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}>or</Divider>

          <Button
            onClick={signInWithGoogleOrLink}
            variant="outlined"
            fullWidth
            startIcon={<Google />}
          >
            Sign in with Google
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Box mt={3} textAlign="center">
              <Typography variant="body2" gutterBottom>
                Don’t have an account?
              </Typography>
              <Button
                component={RouterLink}
                to="/signup"
                variant="outlined"
                color="primary"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Create an account
              </Button>
            </Box>
          </motion.div>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default LoginPage;
