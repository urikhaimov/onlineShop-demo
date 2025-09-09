import React, { useMemo, useState, useCallback } from 'react';
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
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useCategoryTableStore } from '../../../stores/useCategoryTableStore';
import type { TCategory as Category } from '@common/types';

// URL sync for table sorting + column filters
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// Firestore
import {
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  limit as fsLimit,
} from 'firebase/firestore';
import { db, storage } from '../../../firebase';

// Storage (delete product images)
import { ref as storageRef, deleteObject } from 'firebase/storage';

import CategoryExpandedRow from './CategoryExpandedRow';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { sorting, setSorting, columnFilters, setColumnFilters } =
    useCategoryTableStore();

  const { data: categories = [], refetch } = useCategories(undefined, {
    refetchOnMount: 'always',
    staleTime: 0,
  });

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

  // Open confirm dialog from actions column
  const columns = useMemo(
    () =>
      defineCategoryColumns(navigate, (category) => {
        setDeleteError(null);
        setToDelete(category);
      }),
    [navigate],
  );

  // Helper: delete all images for a product (best-effort; ignores missing files)
  async function deleteProductImagesMaybe(urls: unknown) {
    const arr = Array.isArray(urls) ? urls : [];
    for (const url of arr) {
      if (typeof url !== 'string') continue;
      try {
        // ref() accepts gs:// or https download URLs
        const imgRef = storageRef(storage, url);
        await deleteObject(imgRef);
      } catch {
        // ignore — image might have been removed already or URL invalid
      }
    }
  }

  /**
   * Delete all products for a given category in batches, then delete the category.
   * Also removes product images from Storage (best-effort).
   * Returns the number of product docs removed.
   */
  const deleteCategoryWithProducts = useCallback(
    async (categoryId: string): Promise<number> => {
      let totalDeleted = 0;

      // Loop in batches to stay safely under the 500 writes/commit limit
      // We use 400 to leave headroom.

      while (true) {
        const q = query(
          collection(db, 'products'),
          where('categoryId', '==', categoryId),
          fsLimit(400),
        );

        const snap = await getDocs(q);
        if (snap.empty) break;

        const batch = writeBatch(db);

        // Delete Storage images first (best-effort), then queue the doc delete
        for (const d of snap.docs) {
          const data = d.data() as any;
          await deleteProductImagesMaybe(data?.images);
          batch.delete(d.ref);
        }

        await batch.commit();
        totalDeleted += snap.size;
      }

      // Finally delete the category doc itself
      await deleteDoc(doc(db, 'categories', categoryId));

      return totalDeleted;
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const count = await deleteCategoryWithProducts(toDelete.id);
      setToDelete(null);

      enqueueSnackbar(
        t('adminCategoriesPage.snackbarDeletedCascade', {
          defaultValue: 'Category deleted. {{count}} products removed.',
          count,
        }) as string,
        { variant: 'success', autoHideDuration: 3500 },
      );

      if (typeof refetch === 'function') await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (t('adminCategoriesPage.failedToDeleteFallback', {
              defaultValue: 'Failed to delete category (and its products).',
            }) as string);

      setDeleteError(message);
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 4000 });
    } finally {
      setDeleting(false);
    }
  }, [deleteCategoryWithProducts, enqueueSnackbar, refetch, t, toDelete]);

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
                {t('adminCategoriesPage.dialog.warningCascade', {
                  defaultValue:
                    'This will permanently delete the category AND all products in it. This action cannot be undone.',
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
