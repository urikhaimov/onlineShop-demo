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
export interface CategoryFormValues {
  name: string;
  description: string;
  imageUrl: string;
}

interface Props {
  mode: 'add' | 'edit';
  categoryId?: string;
  onSubmit: (data: CategoryFormValues) => void;
}

export default function CategoryForm({ mode, categoryId, onSubmit }: Props) {
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
    },
  });

  const { data: category, isLoading } = useCategoryById(categoryId, {
    enabled: isEdit && !!categoryId,
  });

  useEffect(() => {
    if (category) {
      setValue('name', category.name);
      setValue('description', category.description);
      setValue('imageUrl', category.imageUrl);
    }
  }, [category, setValue]);

  const handleCropUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setValue('imageUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = () => {
    setValue('imageUrl', '');
  };

  if (isEdit && isLoading) {
    return (
      <Box p={2} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="name"
          defaultValue=""
          render={({ field }) => (
            <FormTextField
              {...field}
              label="Name"
              errorObject={errors.name}
              required
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          defaultValue=""
          render={({ field }) => (
            <Box>
              <Typography variant="subtitle1" mb={1}>
                Description
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
                  {errors.description.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <PictureUploaderWithCrop
          avatarUrl={control._formValues.imageUrl}
          onCropUpload={handleCropUpload}
          onDeleteAvatar={handleDeleteAvatar}
        />

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isEdit ? 'Update Category' : 'Create Category'}
        </Button>
      </Stack>
    </Box>
  );
}
