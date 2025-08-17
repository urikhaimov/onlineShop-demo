// src/pages/admin/AdminCategoriesPage.tsx
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../../hooks/useCategories';
import StickyTable from '../../../components/StickyTable';
import { defineCategoryColumns } from './Columns';
import { PageLayout } from '../../../layouts/page.layout';
import type { Row } from '@tanstack/react-table';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useCategoryTableStore } from '../../../stores/useCategoryTableStore';
import type { TCategory as Category } from '@common/types';

// ✅ URL sync for table sorting + column filters
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// 🔥 If you're using Firestore; otherwise replace with your API
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import CategoryExpandedRow from './CategoryExpandedRow';

export default function AdminCategoriesPage() {
  const { sorting, setSorting, columnFilters, setColumnFilters } =
    useCategoryTableStore();

  const { data: categories = [], refetch } = useCategories();
  const navigate = useNavigate();

  // ⛔️ confirm state
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Hook URL ↔ table state
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Pass onDelete into columns; clicking Delete opens the dialog
  const columns = useMemo(
    () =>
      defineCategoryColumns(navigate, (category) => {
        setDeleteError(null);
        setToDelete(category);
      }),
    [navigate],
  );

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'categories', toDelete.id));
      setToDelete(null);
      setSnackbarOpen(true);
      if (typeof refetch === 'function') await refetch();
    } catch (err) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else if (typeof err === 'string') {
        setDeleteError(err);
      } else {
        setDeleteError('Failed to delete category.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={5} py={4}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" fontWeight="bold">
            Manage Categories
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/admin/categories/add')}
          >
            Add Category
          </Button>
        </Box>

        <StickyTable<Category>
          columns={columns}
          data={categories}
          stickyColumnIndex={0}
          enablePagination
          rowsPerPage={8}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          enableSorting
          enableColumnFilters
          // 👇 enable row expansion
          enableRowExpansion
          renderExpandedRow={(category) => (
            <CategoryExpandedRow category={category} />
          )}
        />

        {/* ✅ Success toast */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Category deleted successfully
          </Alert>
        </Snackbar>

        {/* ⛔️ Confirm delete dialog with warning */}
        <Dialog
          open={Boolean(toDelete)}
          onClose={() => (deleting ? null : setToDelete(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Delete category?</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning" variant="outlined">
                This will permanently delete the category. This action cannot be
                undone.
              </Alert>
              <Typography variant="body2">
                Are you sure you want to delete category{' '}
                <strong>{toDelete?.name ?? toDelete?.id}</strong>?
              </Typography>
              {deleteError && (
                <Alert severity="error" variant="filled">
                  {deleteError}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setToDelete(null)}
              disabled={deleting}
              variant="text"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              color="error"
              variant="contained"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageLayout>
  );
}
