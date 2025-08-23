// src/pages/user/UserProfilePage.tsx (or your current path)
import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useUserProfileQuery } from '../../hooks/useUserProfileQuery';
import { useUpdateUserProfileMutation } from '../../hooks/useUpdateUserProfileMutation';
import { useUploadAvatarMutation } from '../../hooks/useUploadAvatarMutation';
import { useDeleteAvatarMutation } from '../../hooks/useDeleteAvatarMutation';
import PictureUploaderWithCrop from '../../components/PictureUploaderWithCrop';
import LoadingProgress from '../../components/LoadingProgress';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import ChangePasswordForm from './components/ChangePasswordForm';
import { useAuth } from '../../hooks/useAuth';
import FormTextField from '../../components/FormTextField';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import {
  useUserProfileToastStore,
  useUserProfileUIStore,
} from '../../stores/useUserProfileUIStore';
import { useTranslation } from 'react-i18next';

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const {
    toastOpen,
    toastMessage,
    errorMsg,
    setToastOpen,
    setToastMessage,
    setErrorMsg,
    resetToast,
  } = useUserProfileToastStore();
  const {
    avatarVer,
    avatarUploading,
    deleteDialogOpen,
    incrementAvatarVer,
    setUploading,
    setDeleteDialog,
  } = useUserProfileUIStore();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '' } });

  const { data: userDoc, isLoading: userDocLoading } = useUserProfileQuery(
    user?.uid,
  );
  const updateMutation = useUpdateUserProfileMutation(user?.uid || '');
  const uploadAvatarMutation = useUploadAvatarMutation(user?.uid || '');
  const deleteAvatarMutation = useDeleteAvatarMutation(user?.uid || '');

  useEffect(() => {
    if (user && userDoc) {
      reset({
        name: userDoc.name ?? '',
        email: user.email ?? '',
      });
    }
  }, [user, userDoc, reset]);

  const onSubmit = async (data: { name: string }) => {
    try {
      await updateMutation.mutateAsync({ name: data.name });
      setToastMessage(
        t('userProfile.toasts.profileUpdated', {
          defaultValue: 'Profile updated',
        }),
      );
      setToastOpen(true);
    } catch {
      setErrorMsg(
        t('userProfile.errors.updateFailed', {
          defaultValue: 'Failed to update profile.',
        }),
      );
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true);
      await uploadAvatarMutation.mutateAsync(file);
      incrementAvatarVer();
      setToastMessage(
        t('userProfile.toasts.profileUpdated', {
          defaultValue: 'Profile updated',
        }),
      );
      setToastOpen(true);
    } catch (err: unknown) {
      const fallback = t('userProfile.errors.avatarUploadFailed', {
        defaultValue: 'Avatar upload failed.',
      });
      const message = err instanceof Error ? err.message : fallback;
      setErrorMsg(message || fallback);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      incrementAvatarVer();
      setToastMessage(
        t('userProfile.toasts.avatarDeleted', {
          defaultValue: 'Avatar deleted',
        }),
      );
      setToastOpen(true);
    } catch {
      setErrorMsg(
        t('userProfile.errors.deleteAvatarFailed', {
          defaultValue: 'Failed to delete avatar',
        }),
      );
    } finally {
      setDeleteDialog(false);
    }
  };

  if (loading || userDocLoading) {
    return <LoadingProgress />;
  }

  if (!user) {
    return (
      <Typography variant="h6" textAlign="center" mt={4}>
        {t('userProfile.empty.noUser', {
          defaultValue: 'No user data available.',
        })}
      </Typography>
    );
  }

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PROFILE}
    >
      <Box
        sx={{
          height: `calc(100vh - ${headerHeight + footerHeight}px)`,
          overflowY: 'auto',
          mt: `${headerHeight}px`,
          mb: `${footerHeight}px`,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            width: '100%',
            maxWidth: 500,
            mx: 'auto',
            borderRadius: 3,
          }}
          elevation={3}
        >
          <Typography variant="h5" textAlign="center" gutterBottom>
            {t('userProfile.title', { defaultValue: 'My Profile' })}
          </Typography>

          <Stack spacing={3} mt={2} alignItems="center">
            <PictureUploaderWithCrop
              avatarUrl={
                userDoc?.photoURL ? `${userDoc.photoURL}?v=${avatarVer}` : null
              }
              onCropUpload={handleAvatarUpload}
              onDeleteAvatar={() => setDeleteDialog(true)}
              disabled={avatarUploading || isSubmitting}
            />

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              width="100%"
            >
              <Stack spacing={2}>
                <FormTextField
                  name="name"
                  label={t('userProfile.fields.name', { defaultValue: 'Name' })}
                  control={control}
                  required
                  errorObject={errors.name}
                />
                <FormTextField
                  name="email"
                  label={t('userProfile.fields.email', {
                    defaultValue: 'Email',
                  })}
                  control={control}
                  disabled
                  value={user.email ?? ''}
                />
                <FormTextField
                  name="uid"
                  label={t('userProfile.fields.uid', { defaultValue: 'UID' })}
                  control={control}
                  disabled
                  value={user.uid ?? ''}
                />
                <ChangePasswordForm />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {t('userProfile.saveChanges', {
                    defaultValue: 'Save Changes',
                  })}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* success toast */}
        <Snackbar
          open={toastOpen}
          autoHideDuration={3000}
          onClose={resetToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" sx={{ width: '100%' }}>
            {toastMessage}
          </Alert>
        </Snackbar>

        {/* error toast */}
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

        {/* delete avatar dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>
            {t('userProfile.dialog.resetAvatar.title', {
              defaultValue: 'Reset Avatar',
            })}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t('userProfile.dialog.resetAvatar.confirm', {
                defaultValue:
                  'Are you sure you want to reset your avatar to the default?',
              })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>
              {t('actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleAvatarDelete}
            >
              {t('actions.delete', { defaultValue: 'Delete' })}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageLayout>
  );
}
