// src/pages/admin/AddCategoryPage.tsx
import React, { useState } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CategoryForm from './CategoryForm';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

// 🔥 Firestore version — replace with your NestJS/REST call if not using Firestore
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

type CategoryFormValues = {
  name: string;
  description?: string;
  imageUrl?: string;
};

export default function AddCategoryPage() {
  const navigate = useNavigate();
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
      // Go back to the list shortly after success
      setTimeout(() => navigate('/admin/categories'), 300);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create category');
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={2} py={3}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Add New Category
        </Typography>

        <CategoryForm
          mode="create" // ✅ use "create", not "add"
          initial={{ name: '', description: '', imageUrl: '' }} // optional defaults
          onSubmit={handleSubmit}
        />

        {/* Success toast */}
        <Snackbar
          open={okOpen}
          autoHideDuration={2500}
          onClose={() => setOkOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Category created
          </Alert>
        </Snackbar>

        {/* Error message (inline) */}
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
