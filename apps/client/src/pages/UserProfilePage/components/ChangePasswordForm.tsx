// src/pages/user/components/ChangePasswordForm.tsx
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import FormTextField from '../../../components/FormTextField';
import { useTranslation } from 'react-i18next';

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordForm() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setErrorMsg(
        t('userProfile.changePassword.errors.mismatch', {
          defaultValue: 'New passwords do not match',
        }),
      );
      return;
    }

    try {
      if (!user?.email || !auth.currentUser) {
        throw new Error(
          t('userProfile.changePassword.errors.unauthenticated', {
            defaultValue: 'Not authenticated',
          }),
        );
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        data.oldPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, data.newPassword);

      setSuccessMsg(
        t('userProfile.changePassword.success', {
          defaultValue: 'Password updated successfully',
        }),
      );
      reset();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          t('userProfile.changePassword.errors.updateFailed', {
            defaultValue: 'Failed to update password',
          }),
      );
    }
  };

  return (
    <Box mt={4} component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h6" gutterBottom>
        {t('userProfile.changePassword.title', {
          defaultValue: 'Change Password',
        })}
      </Typography>

      <Stack spacing={2}>
        <FormTextField
          label={t('userProfile.changePassword.old', {
            defaultValue: 'Old Password',
          })}
          name="oldPassword"
          control={control}
          required
          type={showOld ? 'text' : 'password'}
          errorObject={errors.oldPassword}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowOld((p) => !p)} edge="end">
                  {showOld ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormTextField
          label={t('userProfile.changePassword.new', {
            defaultValue: 'New Password',
          })}
          name="newPassword"
          control={control}
          required
          type={showNew ? 'text' : 'password'}
          errorObject={errors.newPassword}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNew((p) => !p)} edge="end">
                  {showNew ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormTextField
          label={t('userProfile.changePassword.confirm', {
            defaultValue: 'Confirm Password',
          })}
          name="confirmPassword"
          control={control}
          required
          type={showConfirm ? 'text' : 'password'}
          errorObject={errors.confirmPassword}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm((p) => !p)}
                  edge="end"
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button type="submit" variant="outlined" fullWidth>
          {t('userProfile.changePassword.submit', {
            defaultValue: 'Change Password',
          })}
        </Button>
      </Stack>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
