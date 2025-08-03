// src/pages/admin/AddCategoryPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import CategoryForm from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
export default function AddCategoryPage() {
  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
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
    </PageLayout>
  );
}
