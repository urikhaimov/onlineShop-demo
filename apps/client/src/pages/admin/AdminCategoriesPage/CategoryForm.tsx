import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Stack,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import FormTextField from '../../../components/FormTextField';
import PictureUploaderWithCrop from '../../../components/PictureUploaderWithCrop';
import { useCategoryById } from '../../../hooks/useCategories';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';

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

export default function CategoryForm({
  mode,
  categoryId,
  initial,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
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

  // Load existing category into the form when editing
  useEffect(() => {
    if (isEdit) {
      if (!categoryId) return; // guard: edit requires id
      if (category) {
        reset({
          name: category.name ?? '',
          description: category.description ?? '',
          imageUrl: category.imageUrl ?? '',
        });
      }
    }
  }, [isEdit, categoryId, category, reset]);

  const handleCropUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setValue('imageUrl', base64, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = () => {
    setValue('imageUrl', '', { shouldDirty: true });
  };

  if (isEdit && isLoading) {
    return (
      <Box p={2} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  const imageUrl = watch('imageUrl');

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
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

        {/* Image uploader */}
        <PictureUploaderWithCrop
          avatarUrl={imageUrl}
          onCropUpload={handleCropUpload}
          onDeleteAvatar={handleDeleteAvatar}
        />

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isEdit
            ? t('adminCategoriesForm.update', {
                defaultValue: 'Update Category',
              })
            : t('adminCategoriesForm.create', {
                defaultValue: 'Create Category',
              })}
        </Button>
      </Stack>
    </Box>
  );
}
