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
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';

import type { TOrder } from '@common/types';
import { useOrders } from '../../../hooks/useOrders';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import StickyTable from '../../../components/StickyTable';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import {
  useAdminOrdersStore,
  type AdminOrderFilterState,
} from '../../../stores/useAdminOrdersStore';
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

import { defineAdminOrderColumns } from './Columns';
import OrderExpandedRow from './OrderExpandedRow';

import RightFiltersDrawer from '../../../components/RightFiltersDrawer';
import AdminOrderFilters from './AdminOrderFilters';
import AdminPageContainer from '../../../components/AdminPageContainer';

import {
  useAdminOrderFiltersQuerySync,
  clearAdminOrderFiltersInSearchParams,
} from '../../../hooks/useAdminOrderFiltersQuerySync';

import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

/** ---------- types & helpers (fully typed) ---------- */
type OrderItem = {
  price?: number | null;
  quantity?: number | null;
};

type OrderLike = TOrder & {
  /** Some sources may expose another total field */
  total?: number | null;
  amount?: number | null;
  /** Be liberal about shapes we might see */
  items?: OrderItem[] | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  date?: string | Date | null;
  user?: { email?: string | null } | null;
  email?: string | null;
  customer?: { email?: string | null } | null;
};

function extractEmail(o: OrderLike): string | undefined {
  return o.user?.email ?? o.email ?? o.customer?.email ?? undefined;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(+d) ? null : d;
}

function computeOrderTotal(o: OrderLike): number | null {
  if (typeof o.amount === 'number') return o.amount;
  if (typeof o.total === 'number') return o.total;

  const items = Array.isArray(o.items) ? o.items : [];
  if (items.length === 0) return null;

  return items.reduce((sum, it) => {
    const p = Number(it?.price ?? 0);
    const q = Number(it?.quantity ?? 0);
    return sum + (Number.isFinite(p) && Number.isFinite(q) ? p * q : 0);
  }, 0);
}

function orderMatchesFilters(o: OrderLike, f: AdminOrderFilterState): boolean {
  // email search
  const emailTerm = (f.email || '').trim().toLowerCase();
  if (emailTerm) {
    const email = extractEmail(o)?.toLowerCase() ?? '';
    if (!email.includes(emailTerm)) return false;
  }

  // status
  if (f.status && f.status !== 'all') {
    const s = String((o as { status?: unknown }).status ?? '').toLowerCase();
    if (s !== String(f.status).toLowerCase()) return false;
  }

  // totals
  const total = computeOrderTotal(o);
  if (f.minTotal !== null && total !== null && total < f.minTotal) return false;
  if (f.maxTotal !== null && total !== null && total > f.maxTotal) return false;

  // item price range: accept if ANY item price is within range
  if (f.minPrice !== null || f.maxPrice !== null) {
    const items = Array.isArray(o.items) ? o.items : [];
    const hasPriceInRange = items.some((it) => {
      const p = Number(it?.price);
      if (!Number.isFinite(p)) return false;
      if (f.minPrice !== null && p < f.minPrice) return false;
      if (f.maxPrice !== null && p > f.maxPrice) return false;
      return true;
    });
    if (!hasPriceInRange) return false;
  }

  // date range (createdAt/updatedAt/date)
  const d =
    toDate(o.createdAt ?? null) ??
    toDate(o.updatedAt ?? null) ??
    toDate(o.date ?? null);

  if (
    f.startDate &&
    d &&
    d < new Date(new Date(f.startDate).setHours(0, 0, 0, 0))
  )
    return false;
  if (
    f.endDate &&
    d &&
    d > new Date(new Date(f.endDate).setHours(23, 59, 59, 999))
  )
    return false;

  // inStockOnly: at least one item with quantity > 0
  if (f.inStockOnly) {
    const items = Array.isArray(o.items) ? o.items : [];
    const anyQty = items.some((it) => Number(it?.quantity ?? 0) > 0);
    if (!anyQty) return false;
  }

  return true;
}
/** --------------------------------------------------- */

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
    resetFilters,
    filters,
  } = useAdminOrdersStore();

  const { data = [], isLoading, error, refetch } = useOrders();

  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });
  useAdminOrderFiltersQuerySync();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const columns: ColumnDef<TOrder>[] = useMemo(
    () =>
      defineAdminOrderColumns(navigate, (order) => {
        setDeleteError(null);
        setToDelete(order);
      }),
    [navigate],
  );

  /** APPLY FILTERS HERE (type-safe) */
  const filteredData = useMemo<TOrder[]>(() => {
    const list: TOrder[] = Array.isArray(data) ? (data as TOrder[]) : [];
    return list.filter((o) => orderMatchesFilters(o as OrderLike, filters));
  }, [data, filters]);

  const resetTableFilters = () => {
    setSorting([]);
    setColumnFilters([]);
    resetFilters();

    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    clearAdminOrderFiltersInSearchParams(next);
    setParams(next, { replace: true });
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'orders', toDelete.id));
      setToDelete(null);
      setSnackbarOpen(true);
      if (typeof refetch === 'function') await refetch();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete order.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <AdminPageContainer>
        {/* Header actions (Filters + Reset) */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            bgcolor: 'background.paper',
            py: 1,
            mb: 1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setFiltersOpen(true)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={resetTableFilters}
            >
              Reset filters
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {isLoading ? (
          <LoadingProgress />
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            Failed to load orders: {error.message}
          </Typography>
        ) : filteredData.length === 0 ? (
          <NotFound message="No orders found." />
        ) : (
          <StickyTable<TOrder>
            columns={columns}
            data={filteredData}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            enableSorting
            enableColumnFilters={false}
            rowsPerPage={10}
            enableRowExpansion
            renderExpandedRow={(row) => <OrderExpandedRow order={row} />}
            bodyMaxHeight="60vh"
          />
        )}

        {/* action toast */}
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

        {/* confirm delete */}
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

        {/* Filters drawer */}
        <RightFiltersDrawer
          title="Filters"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <AdminOrderFilters onClose={() => setFiltersOpen(false)} />
        </RightFiltersDrawer>
      </AdminPageContainer>
    </PageLayout>
  );
}
