import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';

import {
  useLandingPage,
  useUpdateLandingPage,
} from '../../../hooks/useLandingPage';
import type { LandingPageData } from '../../../types/landing';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
import FormTextField from '../../../components/FormTextField';

export default function AdminLandingPage() {
  const { data, isLoading, isError } = useLandingPage();
  const updateMutation = useUpdateLandingPage();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors },
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

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

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
        <FormTextField
          label="Title"
          name="title"
          control={control}
          errorObject={errors.title}
          required
          disabled={saving}
        />

        <FormTextField
          label="Subtitle"
          name="subtitle"
          control={control}
          errorObject={errors.subtitle}
          disabled={saving}
        />

        <FormTextField
          label="Banner Image URL"
          name="bannerImageUrl"
          control={control}
          errorObject={errors.bannerImageUrl}
          disabled={saving}
        />

        <FormTextField
          label="CTA Button Text"
          name="ctaButtonText"
          control={control}
          errorObject={errors.ctaButtonText}
          disabled={saving}
        />

        <FormTextField
          label="CTA Button Link"
          name="ctaButtonLink"
          control={control}
          errorObject={errors.ctaButtonLink}
          disabled={saving}
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
