// src/pages/admin/landing/AdminLandingPage.tsx
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
import { useForm, useFieldArray } from 'react-hook-form';
import { Add, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import {
  useLandingPage,
  useUpdateLandingPage,
} from '../../../hooks/useLandingPage';
import { LandingPageData } from '../../../types/landing';
import { footerHeight, headerHeight } from '../../../config/themeConfig';
import { HOMEPAGE_LAYOUTS } from '@common/types';
import FormTextField from '../../../components/FormTextField';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { PageLayout } from '../../../layouts/page.layout';

export default function AdminLandingPage() {
  const { t } = useTranslation();
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

  const onSubmit = async (formData: LandingPageData) => {
    try {
      await updateMutation.mutateAsync(formData);
      setToastOpen(true);
    } catch (error) {
      // optionally surface an error toast; leaving console for now
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
        {t('adminLanding.failedToLoad', {
          defaultValue: 'Failed to load landing page data.',
        })}
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
            {t('adminLanding.title', { defaultValue: 'Edit Landing Page' })}
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <FormTextField
                label={t('adminLanding.form.title', { defaultValue: 'Title' })}
                name="title"
                control={control}
                errorObject={errors.title}
                required
                disabled={saving}
              />
              <FormTextField
                label={t('adminLanding.form.subtitle', {
                  defaultValue: 'Subtitle',
                })}
                name="subtitle"
                control={control}
                errorObject={errors.subtitle}
                disabled={saving}
              />
              <FormTextField
                label={t('adminLanding.form.bannerImageUrl', {
                  defaultValue: 'Banner Image URL',
                })}
                name="bannerImageUrl"
                control={control}
                errorObject={errors.bannerImageUrl}
                disabled={saving}
              />
              <FormTextField
                label={t('adminLanding.form.ctaText', {
                  defaultValue: 'CTA Button Text',
                })}
                name="ctaButtonText"
                control={control}
                errorObject={errors.ctaButtonText}
                disabled={saving}
              />
              <FormTextField
                label={t('adminLanding.form.ctaLink', {
                  defaultValue: 'CTA Button Link',
                })}
                name="ctaButtonLink"
                control={control}
                errorObject={errors.ctaButtonLink}
                disabled={saving}
              />

              {/* Layout Selector */}
              <FormTextField
                label={t('adminLanding.form.homepageLayout', {
                  defaultValue: 'Homepage Layout',
                })}
                name="homepageLayout"
                control={control}
                select
                errorObject={errors.homepageLayout}
                disabled={saving}
              >
                {Object.values(HOMEPAGE_LAYOUTS).map((layout) => (
                  <MenuItem key={layout} value={layout}>
                    {t(`layouts.${layout}`, {
                      defaultValue:
                        layout.charAt(0).toUpperCase() + layout.slice(1),
                    })}
                  </MenuItem>
                ))}
              </FormTextField>

              <Typography variant="h6" mt={4}>
                {t('adminLanding.sections.title', { defaultValue: 'Sections' })}
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
                      label={t('adminLanding.sections.sectionTitle', {
                        defaultValue: 'Section Title',
                      })}
                      name={`sections.${index}.title`}
                      control={control}
                      errorObject={errors.sections?.[index]?.title}
                      disabled={saving}
                    />
                    <FormTextField
                      label={t('adminLanding.sections.sectionContent', {
                        defaultValue: 'Section Content',
                      })}
                      name={`sections.${index}.content`}
                      control={control}
                      errorObject={errors.sections?.[index]?.content}
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
                        aria-label={t('adminLanding.sections.remove', {
                          defaultValue: 'Remove section',
                        })}
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
                {t('adminLanding.sections.add', {
                  defaultValue: 'Add Section',
                })}
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={!isDirty || isSubmitting || saving}
                fullWidth
                sx={{ mt: 3 }}
              >
                {saving
                  ? t('common.saving', { defaultValue: 'Saving…' })
                  : t('actions.save', { defaultValue: 'Save' })}
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
              {t('adminLanding.toast.updated', {
                defaultValue: 'Landing page updated successfully!',
              })}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </PageLayout>
  );
}
