import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
  MenuItem,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useForm, useFieldArray } from 'react-hook-form';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { LandingPageData, HOMEPAGE_LAYOUTS } from '@common/types';
import { footerHeight, headerHeight } from '../../../config/themeConfig';
import { PageLayout } from '../../../layouts/page.layout';
import FormTextField from '../../../components/FormTextField';
import PictureUploaderWithCrop from '../../../components/PictureUploaderWithCrop';

import {
  useLandingPage,
  useUpdateLandingPage,
} from '../../../hooks/useLandingPage';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { storage } from '../../../firebase';

export default function AdminLandingPage() {
  const { data, isLoading, isError } = useLandingPage();
  const updateMutation = useUpdateLandingPage();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<LandingPageData>({
    defaultValues: {
      title: '',
      subtitle: '',
      bannerImageUrl: '', // kept in form state (no visible input)
      ctaButtonText: '',
      ctaButtonLink: '',
      homepageLayout: HOMEPAGE_LAYOUTS.Hero,
      sections: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
  });
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const uploadBannerToStorage = async (file: File): Promise<string> => {
    const objectRef = ref(storage, `landing/banner_${Date.now()}.jpg`);
    await uploadBytes(objectRef, file, { contentType: file.type });
    return await getDownloadURL(objectRef);
  };

  const handleBannerCropUpload = async (file: File) => {
    const url = await uploadBannerToStorage(file);
    setValue('bannerImageUrl', url, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleDeleteBanner = () => {
    setValue('bannerImageUrl', '', { shouldDirty: true, shouldValidate: true });
  };

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
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box
        sx={{
          mt: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight + footerHeight}px)`,
          overflowY: 'auto',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" mb={3}>
            Edit Landing Page
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              {/* Banner uploader (replaces manual URL input) */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Banner image</Typography>
                <PictureUploaderWithCrop
                  avatarUrl={(data?.bannerImageUrl ?? '') || undefined}
                  onCropUpload={handleBannerCropUpload}
                  onDeleteAvatar={handleDeleteBanner}
                  disabled={saving}
                />
              </Stack>

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

              {/* Layout Selector */}
              <FormTextField
                label="Homepage Layout"
                name="homepageLayout"
                control={control}
                select
                errorObject={errors.homepageLayout as any}
                disabled={saving}
              >
                {(Object.values(HOMEPAGE_LAYOUTS) as string[]).map((layout) => (
                  <MenuItem key={layout} value={layout}>
                    {String(layout).charAt(0).toUpperCase() +
                      String(layout).slice(1)}
                  </MenuItem>
                ))}
              </FormTextField>

              <Typography variant="h6" mt={4}>
                Sections
              </Typography>

              {fields.map((field, index) => (
                <Paper
                  key={field.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: 'background.default',
                  }}
                >
                  <Stack spacing={2}>
                    <FormTextField
                      label="Section Title"
                      name={`sections.${index}.title`}
                      control={control}
                      errorObject={errors.sections?.[index]?.title as any}
                      disabled={saving}
                    />
                    <FormTextField
                      label="Section Content"
                      name={`sections.${index}.content`}
                      control={control}
                      errorObject={errors.sections?.[index]?.content as any}
                      multiline
                      rows={3}
                      disabled={saving}
                    />
                    <Box display="flex" justifyContent="flex-end">
                      <IconButton
                        onClick={() => remove(index)}
                        color="error"
                        size="small"
                        disabled={saving}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Stack>
                </Paper>
              ))}

              <Button
                startIcon={<Add />}
                onClick={() => append({ title: '', content: '' })}
                variant="outlined"
                disabled={saving}
              >
                Add Section
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={!isDirty || isSubmitting || saving}
                fullWidth
                sx={{ mt: 3 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
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
        </Container>
      </Box>
    </PageLayout>
  );
}
