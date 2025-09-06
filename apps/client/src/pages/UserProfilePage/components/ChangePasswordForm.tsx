// src/pages/user/components/ChangePasswordForm.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
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
import { useSnackbar } from 'notistack';

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordForm() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
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

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      enqueueSnackbar(
        t('userProfile.changePassword.errors.mismatch', {
          defaultValue: 'New passwords do not match',
        }),
        { variant: 'error' },
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

      enqueueSnackbar(
        t('userProfile.changePassword.success', {
          defaultValue: 'Password updated successfully',
        }),
        { variant: 'success' },
      );
      reset();
    } catch (err: any) {
      enqueueSnackbar(
        err?.message ||
          t('userProfile.changePassword.errors.updateFailed', {
            defaultValue: 'Failed to update password',
          }),
        { variant: 'error' },
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

        <Button
          type="submit"
          variant="outlined"
          fullWidth
          disabled={isSubmitting}
        >
          {t('userProfile.changePassword.submit', {
            defaultValue: 'Change Password',
          })}
        </Button>
      </Stack>
    </Box>
  );
}
