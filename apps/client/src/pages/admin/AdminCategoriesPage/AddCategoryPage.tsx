// src/pages/admin/categories/AddCategoryPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Alert, Stack } from '@mui/material';
import CategoryForm, { CategoryFormValues } from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

// Reusable centered card with inner padding
import PageCard from '../../../layouts/PageCard';

export default function AddCategoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (data: CategoryFormValues) => {
    setErr(null);
    try {
      await addDoc(collection(db, 'categories'), {
        name: data.name?.trim() ?? '',
        description: data.description?.trim() ?? '',
        imageUrl: data.imageUrl ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      enqueueSnackbar(
        t('adminCategoriesAddPage.snackbarCreated', {
          defaultValue: 'Category created',
        }) as string,
        { variant: 'success', autoHideDuration: 2500 },
      );

      navigate('/admin/categories');
    } catch (e: any) {
      const message =
        e?.message ??
        (t('adminCategoriesAddPage.failedToCreateFallback', {
          defaultValue: 'Failed to create category.',
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
            {t('adminCategoriesAddPage.title', {
              defaultValue: 'Add New Category',
            })}
          </Typography>

          <CategoryForm
            mode="create"
            initial={{ name: '', description: '', imageUrl: '' }}
            onSubmit={handleSubmit}
          />

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
