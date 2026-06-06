import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import FormTextField from '../../../components/FormTextField';
import ImageUploader, {
  CombinedImage,
} from '../../../components/ImageUploader';
import { useCategoryById } from '../../../hooks/useCategories';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';
import { isDemoAdmin } from '../../../lib/demo-mode';
import { useSnackbar } from 'notistack';

const demoMode = isDemoAdmin();

export interface CategoryFormValues {
  name: string;
  description: string;
  imageUrl: string;
}

interface Props {
  mode: 'create' | 'edit';
  categoryId?: string;
  initial?: Partial<CategoryFormValues>;
  onSubmit: (data: CategoryFormValues) => Promise<void> | void;
}

function genId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CategoryForm({
  mode,
  categoryId,
  initial,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      ...(initial ?? {}),
    },
  });

  const { data: category, isLoading } = useCategoryById(categoryId);
  const [images, setImages] = React.useState<CombinedImage[]>([]);

  useEffect(() => {
    if (!isEdit || !categoryId) return;
    if (category) {
      const url = category.imageUrl ?? '';
      reset({
        name: category.name ?? '',
        description: category.description ?? '',
        imageUrl: url,
      });
      setImages(url ? [{ id: genId(), url, type: 'existing' }] : []);
    }
  }, [isEdit, categoryId, category, reset]);

  useEffect(() => {
    if (!isEdit && initial?.imageUrl) {
      setImages([{ id: genId(), url: initial.imageUrl, type: 'existing' }]);
    }
  }, []);

  useEffect(() => {
    setValue('imageUrl', images[0]?.url ?? '', { shouldDirty: true });
  }, [images, setValue]);

  const handleDrop = React.useCallback(
    (files: File[]) => {
      if (demoMode) {
        enqueueSnackbar('Image uploads are not available in demo mode.', {
          variant: 'info',
          autoHideDuration: 4000,
        });
        return;
      }
      if (!files?.length) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages([{ id: genId(), url: dataUrl, type: 'new' }]);
      };
      reader.readAsDataURL(file);
    },
    [enqueueSnackbar],
  );

  const handleRemove = React.useCallback(() => {
    setImages([]);
    setValue('imageUrl', '', { shouldDirty: true });
  }, [setValue]);

  const handleReorderAll = React.useCallback((newOrder: CombinedImage[]) => {
    setImages(newOrder.slice(0, 1));
  }, []);

  if (isEdit && isLoading) {
    return (
      <Box p={2} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{
        // Ensure the container grows with its children and prevents margin bleed
        overflow: 'auto', // creates a new BFC (fixes “outside” look)
        display: 'flex',
        flexDirection: 'column',
        gap: 2, // spacing without margins
        width: '100%',
        height: '100%',
        pb: 2, // comfy bottom padding
      }}
    >
      {/* Name */}
      <Controller
        control={control}
        name="name"
        rules={{
          required: t('validation.name_required', {
            defaultValue: 'Name is required.',
          }) as string,
          minLength: {
            value: 2,
            message: t('validation.name_minLen', {
              defaultValue: 'Name must be at least 2 characters.',
            }) as string,
          },
        }}
        render={({ field }) => (
          <FormTextField
            {...field}
            label={t('adminCategoriesForm.name', { defaultValue: 'Name' })}
            errorObject={errors.name}
            required
            autoFocus
            fullWidth
          />
        )}
      />

      {/* Description (rich text) */}
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Box>
            <Typography variant="subtitle1" mb={1}>
              {t('adminCategoriesForm.description', {
                defaultValue: 'Description',
              })}
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                '& .ql-toolbar': {
                  bgcolor: 'background.paper',
                  borderBottom: 1,
                  borderColor: 'divider',
                },
                '& .ql-container': {
                  bgcolor: 'background.default',
                  color: 'text.primary',
                  minHeight: 200,
                },
                '& .ql-editor': {
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                },
              }}
            >
              <ReactQuill
                theme="snow"
                value={field.value}
                onChange={field.onChange}
              />
            </Box>
            {errors.description && (
              <Typography variant="caption" color="error" mt={0.5}>
                {String(errors.description.message)}
              </Typography>
            )}
          </Box>
        )}
      />

      {/* Image (single) */}
      <Box>
        <Typography variant="subtitle1" mb={1}>
          {t('adminCategoriesForm.image', { defaultValue: 'Image' })}
        </Typography>
        <ImageUploader
          images={images}
          onDrop={handleDrop}
          onRemove={handleRemove}
          onReorderAll={handleReorderAll}
          maxImages={1}
          withinCard
          singleHeight={240}
          showSnackbar={false}
          containerSx={{
            m: 0,
            width: '100%',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'transparent',
            position: 'relative',
          }}
          dashedSx={{ p: 2, position: 'relative' }}
        />
      </Box>

      {/* Submit */}
      <Box display="flex" justifyContent="flex-end">
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isEdit
            ? t('adminCategoriesForm.update', {
                defaultValue: 'Update Category',
              })
            : t('adminCategoriesForm.create', {
                defaultValue: 'Create Category',
              })}
        </Button>
      </Box>

      {/* tiny spacer as a final guard */}
      <Box sx={{ height: 1 }} />
    </Box>
  );
}
