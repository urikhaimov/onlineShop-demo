import React from 'react';
import { Box, Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import FormTextField from '../../../components/FormTextField';

export interface CategoryFormValues {
  name: string;
  description: string;
  order?: number;
  imageUrl?: string;
}

interface Props {
  defaultValues?: CategoryFormValues;
  onSubmit: (values: CategoryFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  categoryId?: string; // <- optional; required only in edit mode
  mode?: 'add' | 'edit'; // ✅ Add this line
}

export default function CategoryForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    defaultValues,
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <FormTextField
          label="Category Name"
          register={register('name', {
            required: 'Name is required',
          })}
          errorObject={errors.name}
        />

        <FormTextField
          label="Description"
          register={register('description')}
          errorObject={errors.description}
        />

        <FormTextField
          label="Order"
          type="number"
          register={register('order', {
            valueAsNumber: true,
          })}
          errorObject={errors.order}
        />

        <FormTextField
          label="Image URL"
          register={register('imageUrl')}
          errorObject={errors.imageUrl}
        />

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}
