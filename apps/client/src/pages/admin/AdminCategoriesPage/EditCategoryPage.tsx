// src/pages/admin/categories/EditCategoryPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Stack } from '@mui/material';
import CategoryForm, { CategoryFormValues } from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

// Reusable centered card with inner padding
import PageCard from '../../../layouts/PageCard';

export default function EditCategoryPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [err, setErr] = useState<string | null>(null);

  if (!id) {
    return (
      <Box px={2} py={3}>
        <Typography variant="h6" color="error">
          {t('adminCategoriesEditPage.missingId', {
            defaultValue: 'Missing category ID in URL.',
          })}
        </Typography>
      </Box>
    );
  }

  const handleSubmit = async (data: CategoryFormValues) => {
    setErr(null);
    try {
      const ref = doc(db, 'categories', id);
      await updateDoc(ref, {
        name: data.name?.trim() ?? '',
        description: data.description ?? '',
        imageUrl: data.imageUrl ?? '',
        updatedAt: serverTimestamp(),
      });

      enqueueSnackbar(
        t('adminCategoriesEditPage.snackbarUpdated', {
          defaultValue: 'Category updated',
        }) as string,
        { variant: 'success', autoHideDuration: 2500 },
      );

      navigate('/admin/categories');
    } catch (e: any) {
      const message =
        e?.message ??
        (t('adminCategoriesEditPage.failedToUpdateFallback', {
          defaultValue: 'Failed to update category.',
        }) as string);

      setErr(message);
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 4000 });
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <PageCard variant="form" pad={{ xs: 3, sm: 3.5, md: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
            {t('adminCategoriesEditPage.title', {
              defaultValue: 'Edit Category',
            })}
          </Typography>

          <CategoryForm mode="edit" categoryId={id} onSubmit={handleSubmit} />

          {err && (
            <Alert
              severity="error"
              variant="filled"
              onClose={() => setErr(null)}
            >
              {err}
            </Alert>
          )}
        </Stack>
      </PageCard>
    </PageLayout>
  );
}
