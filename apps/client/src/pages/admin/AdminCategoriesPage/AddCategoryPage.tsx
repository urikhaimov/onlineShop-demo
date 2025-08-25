// src/pages/admin/categories/AddCategoryPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Snackbar, Alert, Paper, Stack } from '@mui/material';
import CategoryForm, { CategoryFormValues } from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

import { headerHeight, footerHeight } from '../../../config/themeConfig';
import { useThemeStore } from '../../../stores/useThemeStore';
import {
  contentBoxSx,
  contentPaperSx,
  getLayoutTokens,
} from '../../../utils/uiLayout';

export default function AddCategoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { themeSettings } = useThemeStore();
  const { radius, contentMax } = getLayoutTokens(themeSettings, 'form');

  const [okOpen, setOkOpen] = useState(false);
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

      setOkOpen(true);
      setTimeout(() => navigate('/admin/categories'), 300);
    } catch (e: any) {
      setErr(
        e?.message ??
          t('adminCategoriesAddPage.failedToCreateFallback', {
            defaultValue: 'Failed to create category.',
          }),
      );
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box sx={contentBoxSx(headerHeight, footerHeight)}>
        <Paper elevation={2} sx={contentPaperSx({ contentMax, radius })}>
          <Stack>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
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
        </Paper>
      </Box>

      <Snackbar
        open={okOpen}
        autoHideDuration={2500}
        onClose={() => setOkOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          {t('adminCategoriesAddPage.snackbarCreated', {
            defaultValue: 'Category created',
          })}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
