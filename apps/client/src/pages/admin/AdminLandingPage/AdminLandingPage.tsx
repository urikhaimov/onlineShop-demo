import React, { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
  MenuItem,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useForm, useFieldArray } from 'react-hook-form';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useSnackbar } from 'notistack';

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
import { isDemoAdmin } from '../../../lib/demo-mode';

const demoMode = isDemoAdmin();

const DEFAULT_FORM: LandingPageData = {
  title: 'Welcome to Bunder Shop',
  subtitle: 'Your one-stop e-commerce store',
  bannerImageUrl: '',
  ctaButtonText: 'Shop Now',
  ctaButtonLink: '/products',
  homepageLayout: HOMEPAGE_LAYOUTS.Hero,
  sections: [
    {
      title: 'Featured Deals',
      content: 'Check out our daily deals on popular products.',
    },
  ],
  bentoCards: [
    { title: 'Free shipping', body: 'On orders over $99' },
    { title: '24/7 support', body: 'We’re here anytime' },
    { title: 'Eco materials', body: 'Consciously sourced' },
    { title: '4.9 ★', body: '2,400+ reviews' },
    { title: 'New drops', body: 'Every Friday 10:00' },
    { title: 'Secure checkout', body: 'PayPal secured' },
  ],
};

const isLayout = (v: unknown): v is LandingPageData['homepageLayout'] =>
  (Object.values(HOMEPAGE_LAYOUTS) as string[]).includes(v as string);

export default function AdminLandingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError } = useLandingPage();
  const updateMutation = useUpdateLandingPage();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<LandingPageData>({
    defaultValues: DEFAULT_FORM,
  });

  // FieldArray for "sections"
  const {
    fields: sectionFields,
    append: appendSection,
    remove: removeSection,
    replace: replaceSections,
  } = useFieldArray({
    control,
    name: 'sections',
  });

  // FieldArray for "bentoCards"
  const {
    fields: cardFields,
    append: appendCard,
    remove: removeCard,
    replace: replaceCards,
  } = useFieldArray({
    control,
    name: 'bentoCards',
  });

  // merge server → form defaults; validate layout; sync FieldArrays
  useEffect(() => {
    if (!data) return;

    const merged: LandingPageData = {
      ...DEFAULT_FORM,
      ...data,
      homepageLayout: isLayout(data.homepageLayout)
        ? data.homepageLayout
        : HOMEPAGE_LAYOUTS.Hero,
      sections: (data.sections ?? []).map((s) => ({
        title: s.title ?? '',
        content: s.content ?? '',
      })),
      bentoCards: ((data.bentoCards ?? DEFAULT_FORM.bentoCards) || []).map(
        (c) => ({
          title: c.title ?? '',
          body: c.body ?? '',
        }),
      ),
    };

    reset(merged);
    replaceSections(merged.sections);
    replaceCards(merged.bentoCards!);
  }, [data, reset, replaceSections, replaceCards]);

  const uploadBannerToStorage = async (file: File): Promise<string> => {
    const objectRef = ref(storage, `landing/banner_${Date.now()}.jpg`);
    const task = uploadBytesResumable(objectRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    await new Promise<void>((res, rej) =>
      task.on('state_changed', undefined, rej, () => res()),
    );
    return getDownloadURL(task.snapshot.ref);
  };

  const handleBannerCropUpload = async (file: File) => {
    if (demoMode) {
      enqueueSnackbar('Image uploads are not available in demo mode.', {
        variant: 'info',
        autoHideDuration: 4000,
      });
      return;
    }
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
      const saved = await updateMutation.mutateAsync(formData);
      const next = (saved ?? formData) as LandingPageData;
      reset(next);
      replaceSections(next.sections ?? []);
      replaceCards(next.bentoCards ?? []);
      enqueueSnackbar('Landing page updated successfully!', {
        variant: 'success',
        autoHideDuration: 2500,
      });
    } catch (error) {
      console.error('Failed to update landing page:', error);
      const msg = (error as any)?.message ?? 'Failed to update landing page.';
      enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 4000 });
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
  const bannerPreview = watch('bannerImageUrl');

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
              <Stack spacing={1}>
                <Typography variant="subtitle2">Banner image</Typography>
                <PictureUploaderWithCrop
                  avatarUrl={bannerPreview || undefined}
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
                errorObject={errors.homepageLayout}
                disabled={saving}
              >
                {(Object.values(HOMEPAGE_LAYOUTS) as string[]).map((layout) => (
                  <MenuItem key={layout} value={layout}>
                    {layout.charAt(0).toUpperCase() + layout.slice(1)}
                  </MenuItem>
                ))}
              </FormTextField>

              {/* Sections */}
              <Typography variant="h6" mt={4}>
                Sections
              </Typography>

              {sectionFields.map((field, index) => (
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
                      errorObject={errors.sections?.[index]?.title}
                      disabled={saving}
                    />
                    <FormTextField
                      label="Section Content"
                      name={`sections.${index}.content`}
                      control={control}
                      errorObject={errors.sections?.[index]?.content}
                      multiline
                      rows={3}
                      disabled={saving}
                    />
                    <Box display="flex" justifyContent="flex-end">
                      <IconButton
                        onClick={() => removeSection(index)}
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
                onClick={() => appendSection({ title: '', content: '' })}
                variant="outlined"
                disabled={saving}
              >
                Add Section
              </Button>

              {/* Bento Cards */}
              <Typography variant="h6" mt={4}>
                Feature Cards (Bento)
              </Typography>

              {cardFields.map((field, index) => (
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
                      label="Card Title"
                      name={`bentoCards.${index}.title`}
                      control={control}
                      errorObject={errors.bentoCards?.[index]?.title}
                      disabled={saving}
                    />
                    <FormTextField
                      label="Card Body"
                      name={`bentoCards.${index}.body`}
                      control={control}
                      errorObject={errors.bentoCards?.[index]?.body}
                      multiline
                      rows={2}
                      disabled={saving}
                    />
                    <Box display="flex" justifyContent="flex-end">
                      <IconButton
                        onClick={() => removeCard(index)}
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
                onClick={() => appendCard({ title: '', body: '' })}
                variant="outlined"
                disabled={saving}
              >
                Add Card
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!isDirty || isSubmitting || saving}
                fullWidth
                sx={{ mt: 3 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
          </form>
        </Container>
      </Box>
    </PageLayout>
  );
}
