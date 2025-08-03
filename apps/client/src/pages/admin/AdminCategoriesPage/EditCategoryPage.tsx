import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import CategoryForm from './CategoryForm';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <Box px={2} py={3}>
        <Typography variant="h6" color="error">
          Missing category ID in URL.
        </Typography>
      </Box>
    );
  }

  return (
    <Box px={2} py={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Edit Category
      </Typography>
      <CategoryForm
        mode="edit"
        categoryId={id}
        onSubmit={(data) => {
          // handle form submit
          console.log('Form submitted:', data);
        }}
      />
    </Box>
  );
}
