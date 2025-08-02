// src/pages/admin/AddCategoryPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import CategoryForm from './CategoryForm';

export default function AddCategoryPage() {
  return (
    <Box px={2} py={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Add New Category
      </Typography>
      <CategoryForm
        mode="add"
        onSubmit={(data) => {
          // handle form submit
          console.log('Form submitted:', data);
        }}
      />
    </Box>
  );
}
