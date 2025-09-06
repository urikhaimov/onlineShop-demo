import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
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

// URL sync for table sorting + column filters
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// Firestore
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import CategoryExpandedRow from './CategoryExpandedRow';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { sorting, setSorting, columnFilters, setColumnFilters } =
    useCategoryTableStore();

  const { data: categories = [], refetch } = useCategories();

  // confirm state
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

      enqueueSnackbar(
        t('adminCategoriesPage.snackbarDeleted', {
          defaultValue: 'Category deleted successfully',
        }) as string,
        { variant: 'success', autoHideDuration: 3000 },
      );

      if (typeof refetch === 'function') await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : (t('adminCategoriesPage.failedToDeleteFallback', {
                defaultValue: 'Failed to delete category.',
              }) as string);

      setDeleteError(message);
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 4000 });
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
            {t('adminCategoriesPage.title', {
              defaultValue: 'Manage Categories',
            })}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/admin/categories/add')}
          >
            {t('adminCategoriesPage.add', { defaultValue: 'Add Category' })}
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
          enableRowExpansion
          renderExpandedRow={(category) => (
            <CategoryExpandedRow category={category} />
          )}
        />

        {/* Confirm delete dialog with warning */}
        <Dialog
          open={Boolean(toDelete)}
          onClose={() => (deleting ? null : setToDelete(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            {t('adminCategoriesPage.dialog.title', {
              defaultValue: 'Delete category?',
            })}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning" variant="outlined">
                {t('adminCategoriesPage.dialog.warning', {
                  defaultValue:
                    'This will permanently delete the category. This action cannot be undone.',
                })}
              </Alert>
              <Typography variant="body2">
                {t('adminCategoriesPage.dialog.confirm', {
                  name: toDelete?.name ?? toDelete?.id,
                  defaultValue:
                    'Are you sure you want to delete category {{name}}?',
                })}
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
              {t('adminCategoriesPage.dialog.cancel', {
                defaultValue: 'Cancel',
              })}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              color="error"
              variant="contained"
            >
              {deleting
                ? t('adminCategoriesPage.dialog.deleting', {
                    defaultValue: 'Deleting…',
                  })
                : t('adminCategoriesPage.dialog.delete', {
                    defaultValue: 'Delete',
                  })}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageLayout>
  );
}
