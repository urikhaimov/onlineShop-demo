// src/pages/user/UserProfilePage.tsx
import * as React from 'react';
import { useEffect } from 'react';
import {
  Divider,
  Box,
  Button,
  Stack,
  Paper,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

import { useForm } from 'react-hook-form';
import { useUserProfileQuery } from '../../hooks/useUserProfileQuery';
import { useUpdateUserProfileMutation } from '../../hooks/useUpdateUserProfileMutation';
import { useUploadAvatarMutation } from '../../hooks/useUploadAvatarMutation';
import { useDeleteAvatarMutation } from '../../hooks/useDeleteAvatarMutation';

import PictureUploaderWithCrop from '../../components/PictureUploaderWithCrop';
import LoadingProgress from '../../components/LoadingProgress';
import ChangePasswordForm from './components/ChangePasswordForm';
import { useAuth } from '../../hooks/useAuth';
import FormTextField from '../../components/FormTextField';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useUserProfileUIStore } from '../../stores/useUserProfileUIStore';
import { useTranslation } from 'react-i18next';

import PageContainer from '../../components/PageContainer';
import AdminHeaderBar from '../../components/AdminHeaderBar';
import { useSnackbar } from 'notistack';
import GoogleLinkSection from '../../components/profile/GoogleLinkSection';

type FormValues = { name: string; email?: string; uid?: string };

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();

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
  } = useForm<FormValues>({ defaultValues: { name: '', email: '', uid: '' } });

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
        uid: user.uid ?? '',
      });
    }
  }, [user, userDoc, reset]);

  const onSubmit = async (data: { name: string }) => {
    try {
      await updateMutation.mutateAsync({ name: data.name });
      enqueueSnackbar(
        t('userProfile.toasts.profileUpdated', {
          defaultValue: 'Profile updated',
        }),
        { variant: 'success' },
      );
    } catch {
      enqueueSnackbar(
        t('userProfile.errors.updateFailed', {
          defaultValue: 'Failed to update profile.',
        }),
        { variant: 'error' },
      );
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true);
      await uploadAvatarMutation.mutateAsync(file);
      incrementAvatarVer();
      enqueueSnackbar(
        t('userProfile.toasts.profileUpdated', {
          defaultValue: 'Profile updated',
        }),
        { variant: 'success' },
      );
    } catch (err: unknown) {
      const fallback = t('userProfile.errors.avatarUploadFailed', {
        defaultValue: 'Avatar upload failed.',
      });
      const message = err instanceof Error ? err.message : fallback;
      enqueueSnackbar(message || fallback, { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      incrementAvatarVer();
      enqueueSnackbar(
        t('userProfile.toasts.avatarDeleted', {
          defaultValue: 'Avatar deleted',
        }),
        { variant: 'success' },
      );
    } catch {
      enqueueSnackbar(
        t('userProfile.errors.deleteAvatarFailed', {
          defaultValue: 'Failed to delete avatar',
        }),
        { variant: 'error' },
      );
    } finally {
      setDeleteDialog(false);
    }
  };

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PROFILE}
    >
      <PageContainer>
        <AdminHeaderBar
          title={t('userProfile.title', { defaultValue: 'My Profile' })}
        />

        {/* Controls (always visible) */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            bgcolor: 'background.paper',
            py: 1,
            mb: 1,
          }}
        >
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveAltIcon />}
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || avatarUploading}
            >
              {t('userProfile.saveChanges', { defaultValue: 'Save Changes' })}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {loading || userDocLoading ? (
          <LoadingProgress />
        ) : !user ? (
          <Typography variant="h6" textAlign="center" mt={4}>
            {t('userProfile.empty.noUser', {
              defaultValue: 'No user data available.',
            })}
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
            {/* Profile Card */}
            <Paper
              elevation={2}
              sx={{
                width: '100%',
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
              }}
            >
              <Typography
                variant="h5"
                textAlign="center"
                sx={{ mb: 1 }}
                fontWeight={600}
              >
                {t('userProfile.title', { defaultValue: 'My Profile' })}
              </Typography>

              <Stack spacing={3} mt={1} alignItems="center">
                <PictureUploaderWithCrop
                  avatarUrl={
                    userDoc?.photoURL
                      ? `${userDoc.photoURL}?v=${avatarVer}`
                      : null
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
                      label={t('userProfile.fields.name', {
                        defaultValue: 'Name',
                      })}
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
                    />
                    <FormTextField
                      name="uid"
                      label={t('userProfile.fields.uid', {
                        defaultValue: 'UID',
                      })}
                      control={control}
                      disabled
                    />
                    <ChangePasswordForm />

                    {/* Hidden submit so Enter key works; the sticky Save button calls handleSubmit too */}
                    <button type="submit" style={{ display: 'none' }} />
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Sign-in methods: Google link/unlink */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('userProfile.signInMethods', {
                  defaultValue: 'Sign-in methods',
                })}
              </Typography>
              <GoogleLinkSection />
            </Paper>
          </Stack>
        )}

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
      </PageContainer>
    </PageLayout>
  );
}
