import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import CategoryForm from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

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
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
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
    </PageLayout>
  );
}
