import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

import {
  useLandingPage,
  useUpdateLandingPage,
} from '../../../hooks/useLandingPage';
import type { LandingPageData } from '../../../types/landing';
import { headerHeight, footerHeight } from '@client/config/themeConfig';
export default function AdminLandingPage() {
  const { data, isLoading, isError } = useLandingPage();
  const updateMutation = useUpdateLandingPage();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<LandingPageData>({
    defaultValues: {
      title: '',
      subtitle: '',
      bannerImageUrl: '',
      ctaButtonText: '',
      ctaButtonLink: '',
      sections: [],
    },
  });

  const [toastOpen, setToastOpen] = useState(false);

  // Reset form values when data changes
  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  // Form submit handler
  const onSubmit = async (formData: LandingPageData) => {
    try {
      await updateMutation.mutateAsync(formData);
      setToastOpen(true);
    } catch (error) {
      console.error('Failed to update landing page:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 6 }}>
        Failed to load landing page data.
      </Typography>
    );
  }

  const saving = updateMutation.status === 'pending';

  return (
    <Box
          sx={{
            position: 'relative',
            mt: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight + footerHeight}px)`,
            overflowY: 'auto',
            px: 2,
            py: 4,
          }}
        >
      <Typography variant="h4" mb={3}>
        Edit Landing Page
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="title"
          control={control}
          rules={{ required: 'Title is required' }}
          render={({ field, fieldState }) => (
            <TextField
              label="Title"
              fullWidth
              margin="normal"
              {...field}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              disabled={saving}
            />
          )}
        />

        <Controller
          name="subtitle"
          control={control}
          render={({ field }) => (
            <TextField
              label="Subtitle"
              fullWidth
              margin="normal"
              {...field}
              disabled={saving}
            />
          )}
        />

        <Controller
          name="bannerImageUrl"
          control={control}
          render={({ field }) => (
            <TextField
              label="Banner Image URL"
              fullWidth
              margin="normal"
              {...field}
              disabled={saving}
            />
          )}
        />

        <Controller
          name="ctaButtonText"
          control={control}
          render={({ field }) => (
            <TextField
              label="CTA Button Text"
              fullWidth
              margin="normal"
              {...field}
              disabled={saving}
            />
          )}
        />

        <Controller
          name="ctaButtonLink"
          control={control}
          render={({ field }) => (
            <TextField
              label="CTA Button Link"
              fullWidth
              margin="normal"
              {...field}
              disabled={saving}
            />
          )}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={!isDirty || isSubmitting || saving}
          sx={{ mt: 3 }}
          fullWidth
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>

      <Snackbar
        open={toastOpen}
        autoHideDuration={2500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Landing page updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}
