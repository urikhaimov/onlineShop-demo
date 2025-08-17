// src/pages/admin/index.tsx (AdminOrdersPage)
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Typography,
  Snackbar,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';

import { Order, useOrders } from '../../../hooks/useOrders';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import StickyTable from '../../../components/StickyTable';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useAdminOrdersStore } from '../../../stores/useAdminOrdersStore';
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// columns
import { defineAdminOrderColumns } from './Columns';

// expanded row
import OrderExpandedRow from './OrderExpandedRow';

// 🔥 If you're using Firestore; otherwise replace with your API
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    snackbarOpen,
    setSnackbarOpen,
  } = useAdminOrdersStore();

  // expose refetch if your hook supports it
  const { data = [], isLoading, error, refetch } = useOrders();

  // sync table state to the URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // ⛔️ confirm state
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // this onDelete is passed into the columns; clicking "Delete" opens the dialog
  const columns: ColumnDef<Order>[] = useMemo(
    () =>
      defineAdminOrderColumns(navigate, (order) => {
        setDeleteError(null);
        setToDelete(order);
      }),
    [navigate],
  );

  const resetTableFilters = () => {
    setSorting([]);
    setColumnFilters([]);
    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    setParams(next, { replace: true });
  };

  // ✅ perform the deletion when user confirms
  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // replace this with your REST/NestJS call if you’re not on Firestore
      await deleteDoc(doc(db, 'orders', toDelete.id));
      setToDelete(null);
      setSnackbarOpen(true);
      // refresh table data if available
      if (typeof refetch === 'function') await refetch();
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Failed to delete order.');
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
          <Typography variant="h6">Admin Orders</Typography>
          <Button size="small" variant="outlined" onClick={resetTableFilters}>
            Reset filters
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {isLoading ? (
          <LoadingProgress />
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            Failed to load orders: {error.message}
          </Typography>
        ) : data.length === 0 ? (
          <NotFound message="No orders found." />
        ) : (
          <StickyTable<Order>
            columns={columns}
            data={data}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            enableSorting
            enableColumnFilters
            rowsPerPage={10}
            // 👇 expanded row support
            enableRowExpansion
            renderExpandedRow={(row) => (
              <OrderExpandedRow order={row as unknown as any} />
            )}
          />
        )}

        {/* ✅ Success toast (already in your page) */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Action completed successfully
          </Alert>
        </Snackbar>

        {/* ⛔️ Confirm delete dialog with warning */}
        <Dialog
          open={Boolean(toDelete)}
          onClose={() => (deleting ? null : setToDelete(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Delete order?</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning" variant="outlined">
                This will permanently delete the order and its details. This
                action cannot be undone.
              </Alert>
              <Typography variant="body2">
                Are you sure you want to delete order{' '}
                <strong>{toDelete?.id}</strong>?
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
