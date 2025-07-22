import React, { useEffect, useReducer } from 'react';
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
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useUserProfileQuery } from '../../hooks/useUserProfileQuery';
import { useUpdateUserProfileMutation } from '../../hooks/useUpdateUserProfileMutation';
import { useUploadAvatarMutation } from '../../hooks/useUploadAvatarMutation';
import { useDeleteAvatarMutation } from '../../hooks/useDeleteAvatarMutation';
import PictureUploaderWithCrop from '../../components/PictureUploaderWithCrop';
import LoadingProgress from '../../components/LoadingProgress';
import { initialState, reducer } from './LocalReducer';
import { initialLocalUIState, localUIReducer } from './LocalUIReducer';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import ChangePasswordForm from './components/ChangePasswordForm';
import { useAuth } from '../../hooks/useAuth';

export default function UserProfilePage() {
  const { user, loading } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [uiState, uiDispatch] = useReducer(localUIReducer, initialLocalUIState);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

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
      dispatch({ type: 'SET_TOAST_MESSAGE', payload: 'Profile updated' });
      dispatch({ type: 'SET_TOAST_OPEN', payload: true });
    } catch (err) {
      dispatch({ type: 'SET_ERROR_MSG', payload: 'Failed to update profile.' });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      uiDispatch({ type: 'SET_UPLOADING', payload: true });
      await uploadAvatarMutation.mutateAsync(file);
      uiDispatch({ type: 'INCREMENT_AVATAR_VER' });
      dispatch({ type: 'SET_TOAST_MESSAGE', payload: 'Profile updated' });
      dispatch({ type: 'SET_TOAST_OPEN', payload: true });
    } catch (err: any) {
      dispatch({
        type: 'SET_ERROR_MSG',
        payload: err?.message || 'Avatar upload failed.',
      });
    } finally {
      uiDispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      uiDispatch({ type: 'INCREMENT_AVATAR_VER' });
      dispatch({ type: 'SET_TOAST_MESSAGE', payload: 'Avatar deleted' });
      dispatch({ type: 'SET_TOAST_OPEN', payload: true });
    } catch (err) {
      dispatch({ type: 'SET_ERROR_MSG', payload: 'Failed to delete avatar' });
    } finally {
      uiDispatch({ type: 'SET_DELETE_DIALOG', payload: false });
    }
  };

  if (loading || userDocLoading) {
    return <LoadingProgress />;
  }

  if (!user) {
    return (
      <Typography variant="h6" textAlign="center" mt={4}>
        No user data available.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        mt: `${headerHeight}px`,
        mb: `${footerHeight}px`,
        minHeight: `calc(100vh - ${headerHeight + footerHeight}px)`,
        px: 2,
        py: 4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'start',
        overflowY: 'auto',
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
          My Profile
        </Typography>

        <Stack spacing={3} mt={2} alignItems="center">
          <PictureUploaderWithCrop
            avatarUrl={
              userDoc?.photoURL
                ? `${userDoc.photoURL}?v=${uiState.avatarVer}`
                : null
            }
            onCropUpload={handleAvatarUpload}
            onDeleteAvatar={() =>
              uiDispatch({ type: 'SET_DELETE_DIALOG', payload: true })
            }
            disabled={uiState.avatarUploading || isSubmitting}
          />

          <Box component="form" onSubmit={handleSubmit(onSubmit)} width="100%">
            <Stack spacing={2}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <TextField
                label="Email"
                value={user.email ?? ''}
                fullWidth
                disabled
              />
              <TextField
                label="UID"
                value={user.uid ?? ''}
                fullWidth
                disabled
              />
              <ChangePasswordForm />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
              >
                Save Changes
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Snackbar
        open={state.toastOpen}
        autoHideDuration={3000}
        onClose={() => {
          dispatch({ type: 'SET_TOAST_OPEN', payload: false });
          dispatch({ type: 'SET_TOAST_MESSAGE', payload: '' });
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {state.toastMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!state.errorMsg}
        autoHideDuration={4000}
        onClose={() => dispatch({ type: 'SET_ERROR_MSG', payload: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {state.errorMsg}
        </Alert>
      </Snackbar>

      <Dialog
        open={uiState.deleteDialogOpen}
        onClose={() =>
          uiDispatch({ type: 'SET_DELETE_DIALOG', payload: false })
        }
      >
        <DialogTitle>Reset Avatar</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset your avatar to the default?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              uiDispatch({ type: 'SET_DELETE_DIALOG', payload: false })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleAvatarDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
