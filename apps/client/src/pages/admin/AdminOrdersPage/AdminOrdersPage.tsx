import * as React from 'react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Divider,
  Box,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';

import type { TOrder } from '@common/types';
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
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { useOrdersQuery } from '../../../hooks/useOrdersQuery';
import { isDemoAdmin } from '../../../lib/demo-mode';

// ⬇️ NEW: header + CSV
import AdminHeaderBar from '../../../components/AdminHeaderBar';
import { downloadOrdersCsv } from '../../../utils/exportOrdersToCsv';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
/** ---------- types & helpers (fully typed) ---------- */
type OrderItem = {
  price?: number | null;
  quantity?: number | null;
};

type OrderLike = TOrder & {
  total?: number | null;
  amount?: number | null;
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
  const emailTerm = (f.email || '').trim().toLowerCase();
  if (emailTerm) {
    const email = extractEmail(o)?.toLowerCase() ?? '';
    if (!email.includes(emailTerm)) return false;
  }

  if (f.status && f.status !== 'all') {
    const s = String((o as { status?: unknown }).status ?? '').toLowerCase();
    if (s !== String(f.status).toLowerCase()) return false;
  }

  const total = computeOrderTotal(o);
  if (f.minTotal !== null && total !== null && total < f.minTotal) return false;
  if (f.maxTotal !== null && total !== null && total > f.maxTotal) return false;

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

  if (f.inStockOnly) {
    const items = Array.isArray(o.items) ? o.items : [];
    const anyQty = items.some((it) => Number(it?.quantity ?? 0) > 0);
    if (!anyQty) return false;
  }

  return true;
}
/** --------------------------------------------------- */

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    resetFilters,
    filters, // from useAdminOrdersStore (email, status, min/maxTotal, price, dates, inStockOnly…)
  } = useAdminOrdersStore();

  // Table ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Filters ↔ URL
  useAdminOrderFiltersQuerySync();

  // Drawer + delete dialog
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

  // Build server params from filters & table sort (use first sort)
  const serverParams = useMemo(() => {
    const firstSort =
      Array.isArray(sorting) && sorting.length ? sorting[0] : null;
    const sort =
      firstSort && firstSort.id
        ? `${firstSort.id}:${firstSort.desc ? 'desc' : 'asc'}`
        : 'createdAt:desc';

    return {
      q: (filters.email || '').trim() || undefined,
      status:
        filters.status && filters.status !== 'all' ? filters.status : undefined,
      totalMin: filters.minTotal ?? undefined,
      totalMax: filters.maxTotal ?? undefined,
      priceMin: filters.minPrice ?? undefined,
      priceMax: filters.maxPrice ?? undefined,
      startDate: filters.startDate ?? undefined,
      endDate: filters.endDate ?? undefined,
      inStockOnly: filters.inStockOnly ? true : undefined,
      limit: 500,
      page: 1,
      sort,
    };
  }, [filters, sorting]);

  // 🔎 Fetch orders via React Query
  const {
    data: orderResult,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrdersQuery(serverParams, { enabled: !isDemoAdmin() });

  const data = orderResult?.items ?? [];

  // Client-side guard (keeps UX consistent if backend lacks some filters)
  const filteredData = useMemo<TOrder[]>(
    () => data.filter((o) => orderMatchesFilters(o as OrderLike, filters)),
    [data, filters],
  );

  // ⬇️ NEW: Export CSV handler (uses currently filtered rows)
  const onExportCsv = useCallback(() => {
    downloadOrdersCsv(filteredData);
  }, [filteredData]);

  // Reset table filters + URL + store filters
  const resetTableFilters = useCallback(() => {
    setSorting([]);
    setColumnFilters([]);
    resetFilters();

    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    clearAdminOrderFiltersInSearchParams(next);
    if (params.toString() !== next.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, setParams, setSorting, setColumnFilters, resetFilters]);

  // Delete order (Firestore) + refresh
  const handleConfirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'orders', toDelete.id));
      setToDelete(null);

      enqueueSnackbar(
        t('adminOrdersPage.snackbarSuccess', {
          defaultValue: 'Order deleted successfully',
        }) as string,
        { variant: 'success', autoHideDuration: 3000 },
      );

      await refetch();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (t('adminOrdersPage.failedToDeleteFallback', {
              defaultValue: 'Failed to delete order.',
            }) as string);
      setDeleteError(msg);
      enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 4000 });
    } finally {
      setDeleting(false);
    }
  }, [enqueueSnackbar, refetch, t, toDelete]);

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <AdminPageContainer>
        {/* NEW: Header bar with title, Reset, and Export CSV */}
        <AdminHeaderBar
          title={t('adminOrdersPage.title', { defaultValue: 'Orders' })}
          onReset={resetTableFilters}
          rightActions={
            <Button variant="outlined" size="small" onClick={onExportCsv}>
              {t('actions.exportCsv', { defaultValue: 'Export CSV' })}
            </Button>
          }
        />

        {/* Sticky controls (Filters + Reset) */}
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
              {t('filters.open')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={resetTableFilters}
            >
              {t('filters.reset')}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {isDemoAdmin() ? (
          <NotFound message={t('adminOrdersPage.notFound')} />
        ) : isFetching ? (
          <LoadingProgress />
        ) : isError ? (
          <Typography color="error" sx={{ p: 2 }}>
            {t('adminOrdersPage.failedToLoad', {
              message: (error as Error)?.message ?? '',
            })}
          </Typography>
        ) : filteredData.length === 0 ? (
          <NotFound message={t('adminOrdersPage.notFound')} />
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
            enablePagination
            rowsPerPage={10}
            enableRowExpansion
            renderExpandedRow={(row) => <OrderExpandedRow order={row} />}
            bodyMaxHeight="60vh"
            getRowId={(o) => o.id}
          />
        )}

        {/* confirm delete */}
        <Dialog
          open={Boolean(toDelete)}
          onClose={(_, __) => (deleting ? undefined : setToDelete(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t('adminOrdersPage.dialog.title')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning" variant="outlined">
                {t('adminOrdersPage.dialog.warning')}
              </Alert>
              <Typography variant="body2">
                {t('adminOrdersPage.dialog.confirm', { id: toDelete?.id })}
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
              {t('adminOrdersPage.dialog.cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              color="error"
              variant="contained"
            >
              {deleting
                ? t('adminOrdersPage.dialog.deleting')
                : t('adminOrdersPage.dialog.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Filters drawer */}
        <RightFiltersDrawer
          title={t('filters.open')}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <AdminOrderFilters onClose={() => setFiltersOpen(false)} />
        </RightFiltersDrawer>
      </AdminPageContainer>
    </PageLayout>
  );
}
