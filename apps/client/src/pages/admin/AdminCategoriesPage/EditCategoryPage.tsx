import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import CategoryForm, { CategoryFormValues } from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

// 🔥 Firestore version — replace with your NestJS/REST call if not using Firestore
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function EditCategoryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [okOpen, setOkOpen] = useState(false);
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
      // ✅ Update Firestore document (adjust field names to your type)
      const ref = doc(db, 'categories', id);
      await updateDoc(ref, {
        name: data.name?.trim() ?? '',
        description: data.description ?? '',
        imageUrl: data.imageUrl ?? '',
        updatedAt: serverTimestamp(),
      });

      setOkOpen(true);
      // Return to categories list (or stay on page—up to you)
      setTimeout(() => navigate('/admin/categories'), 300);
    } catch (e: any) {
      setErr(
        e?.message ??
          t('adminCategoriesEditPage.failedToUpdateFallback', {
            defaultValue: 'Failed to update category.',
          }),
      );
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={2} py={3}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {t('adminCategoriesEditPage.title', {
            defaultValue: 'Edit Category',
          })}
        </Typography>

        {/* CategoryForm handles loading existing values when mode="edit" + categoryId */}
        <CategoryForm mode="edit" categoryId={id} onSubmit={handleSubmit} />

        {/* ✅ Success toast */}
        <Snackbar
          open={okOpen}
          autoHideDuration={2500}
          onClose={() => setOkOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            {t('adminCategoriesEditPage.snackbarUpdated', {
              defaultValue: 'Category updated',
            })}
          </Alert>
        </Snackbar>

        {/* ⛔ Error alert (inline) */}
        {err && (
          <Box mt={2}>
            <Alert
              severity="error"
              variant="filled"
              onClose={() => setErr(null)}
            >
              {err}
            </Alert>
          </Box>
        )}
      </Box>
    </PageLayout>
  );
}
