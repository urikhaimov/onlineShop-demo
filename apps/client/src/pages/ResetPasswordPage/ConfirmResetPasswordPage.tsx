import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

export default function ConfirmResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = params.get('oobCode') || '';
  const mode = params.get('mode');

  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (mode !== 'resetPassword' || !oobCode) throw new Error('NO_CODE');
        const emailFromCode = await verifyPasswordResetCode(auth, oobCode);
        setEmail(emailFromCode);
      } catch {
        setErr(
          'This reset link is invalid or expired. Please request a new one.',
        );
      }
    })();
  }, [mode, oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk('');

    if (!pw1 || pw1.length < 6)
      return setErr('Password must be at least 6 characters.');
    if (pw1 !== pw2) return setErr('Passwords do not match.');

    try {
      setSubmitting(true);
      await confirmPasswordReset(auth, oobCode, pw1);
      // Success → go to Login with a success hint
      setOk('Password updated successfully. Redirecting to login…');
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (e: any) {
      const code = e?.code;
      setErr(
        code === 'auth/expired-action-code'
          ? 'This reset link has expired.'
          : code === 'auth/invalid-action-code'
            ? 'Invalid reset link.'
            : 'Failed to update password.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // If no code → show a “send again” shortcut
  if (!oobCode) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        px={2}
      >
        <Paper sx={{ p: 4, maxWidth: 480, width: '100%' }}>
          <Typography variant="h5" textAlign="center" gutterBottom>
            Reset link missing
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This page must be opened from the email link. Please request a new
            reset email.
          </Alert>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/reset-password', { replace: true })}
          >
            Send reset email again
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      minHeight="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      px={2}
    >
      <Paper sx={{ p: 4, maxWidth: 480, width: '100%' }}>
        <Typography variant="h5" textAlign="center" gutterBottom>
          Set a New Password
        </Typography>
        {email && (
          <Typography variant="body2" textAlign="center">
            for <b>{email}</b>
          </Typography>
        )}

        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}
        {ok && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {ok}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Stack spacing={2} mt={2}>
            <TextField
              label="New password"
              type={showPw ? 'text' : 'password'}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw((v) => !v)} edge="end">
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            <TextField
              label="Confirm password"
              type={showPw ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
