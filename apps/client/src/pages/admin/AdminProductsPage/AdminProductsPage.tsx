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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { createCategoryGroupHeader } from './CategoryGroupHeader';
import StickyTable from '../../../components/StickyTable';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import type { IProduct } from '@common/types';
import { useProductColumns } from './Columns';
import { useCategories } from '../../../hooks/useCategories';
import { useProductMutations } from '../../../hooks/useProductMutations';
import { useProductsQuery } from '../../../hooks/useProductsQuery';
import { auth } from '../../../firebase';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useAdminProductsStore } from '../../../stores/useAdminProductsStore';
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';
import ProductExpandedRow from './ProductExpandedRow';

import PageContainer from '../../../components/PageContainer';
import AdminHeaderBar from '../../../components/AdminHeaderBar';
import RightFiltersDrawer from '../../../components/RightFiltersDrawer';
import AdminProductFilters from './AdminProductFilters';

import { useProductStore } from '../../../stores/useProductStore';
import {
  useAdminProductFiltersQuerySync,
  clearAdminProductFiltersInSearchParams,
} from '../../../hooks/useAdminProductFiltersQuerySync';
import { useTranslation } from 'react-i18next';

const PRICE_MIN = 0;
const PRICE_MAX = 100_000;
const STOCK_MIN = 0;
const STOCK_MAX = 1_000;

type ProductLike = IProduct & {
  price?: number | null;
  stock?: number | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : (value as Date);
  return Number.isNaN(+d) ? null : d;
}

export default function AdminProductsPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const {
    products,
    loading,
    sorting,
    columnFilters,
    setProducts,
    setProductsSorted,
    setLoading,
    setSorting,
    setColumnFilters,
    filtersOpen,
    setFiltersOpen,
  } = useAdminProductsStore();

  const {
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    updatedFrom,
    updatedTo,
    setSearchTerm,
    setSelectedCategoryId,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
    setUpdatedFrom,
    setUpdatedTo,
  } = useProductStore();

  const [params, setParams] = useSearchParams();

  const { data: categories = [] } = useCategories(undefined, {
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { reorder, remove } = useProductMutations();
  const navigate = useNavigate();

  // --- Delete dialog state ----------------------------------------------------
  const [toDelete, setToDelete] = useState<IProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteDialog = useCallback((p: IProduct) => {
    setDeleteError(null);
    setToDelete(p);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setDeleting(false);
      enqueueSnackbar(
        t('common.authRequired', {
          defaultValue: 'You must be signed in.',
        }) as string,
        { variant: 'error', autoHideDuration: 3500 },
      );
      return;
    }

    // optimistic update
    const prev = products;
    setProducts(prev.filter((p) => p.id !== toDelete.id));

    try {
      await remove.mutateAsync(toDelete.id);
      enqueueSnackbar(
        t('adminProductsPage.snackbarDeleted', {
          defaultValue: 'Product deleted successfully',
        }) as string,
        { variant: 'success', autoHideDuration: 3000 },
      );
      setToDelete(null);
    } catch (err) {
      console.error('❌ Delete failed', err);
      setProducts(prev); // rollback
      const message =
        err instanceof Error
          ? err.message
          : (t('adminProductsPage.deleteFailed', {
              defaultValue: 'Failed to delete product.',
            }) as string);
      setDeleteError(message);
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 4000 });
    } finally {
      setDeleting(false);
    }
  }, [enqueueSnackbar, products, remove, setProducts, t, toDelete]);
  // ---------------------------------------------------------------------------

  // columns: pass "openDeleteDialog" so the table opens the dialog (no alerts)
  const columns = useProductColumns(categories, navigate, openDeleteDialog);

  // Table ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Filters ↔ URL
  useAdminProductFiltersQuerySync();

  // Reorder mode toggle
  const [reorderMode, setReorderMode] = React.useState(false);

  // While in reorder mode, clear header sorting (so server + UI don't fight you)
  useEffect(() => {
    if (reorderMode && sorting.length) setSorting([]);
  }, [reorderMode, sorting, setSorting]);

  // Build server query params from current UI state
  const serverParams = useMemo(() => {
    const firstSort =
      Array.isArray(sorting) && sorting.length ? sorting[0] : null;

    const sort = reorderMode
      ? 'order:asc'
      : firstSort && firstSort.id
        ? `${firstSort.id}:${firstSort.desc ? 'desc' : 'asc'}`
        : 'order:asc';

    return {
      q: searchTerm || undefined,
      categoryId: selectedCategoryId || undefined,
      priceMin: minPrice ?? undefined,
      priceMax: maxPrice ?? undefined,
      stockMin: minStock ?? undefined,
      stockMax: maxStock ?? undefined,
      limit: 500,
      page: 1,
      sort,
    };
  }, [
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    sorting,
    reorderMode,
  ]);

  // 🔎 Query the API
  const {
    data: productResult,
    isFetching,
    isError,
    error,
  } = useProductsQuery(serverParams, { enabled: true });

  // Keep store "loading" in sync with query
  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  // Push results into the store
  useEffect(() => {
    const items = productResult?.items ?? [];
    setProductsSorted(items);
  }, [productResult, setProductsSorted]);

  // Surface errors nicely
  useEffect(() => {
    if (isError) {
      console.error('❌ Failed to load products:', error);
      enqueueSnackbar(
        t('adminProductsPage.loadFailed', {
          defaultValue: 'Failed to load products.',
        }) as string,
        { variant: 'error', autoHideDuration: 4000 },
      );
    }
  }, [isError, error, enqueueSnackbar, t]);

  // ---- Reorder wiring
  const byId = useMemo(() => {
    const m = new Map<string, IProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const handleReorder = async (orderedIds: string[]) => {
    const idToIndex = new Map<string, number>(
      products.map((p, i) => [p.id, i]),
    );

    const positions = orderedIds
      .map((id) => idToIndex.get(id))
      .filter((i): i is number => typeof i === 'number')
      .sort((a, b) => a - b);

    const reorderedVisible = orderedIds
      .map((id) => byId.get(id))
      .filter((p): p is IProduct => Boolean(p));

    const nextAll = products.slice();
    positions.forEach((pos, i) => {
      nextAll[pos] = reorderedVisible[i];
    });

    setProducts(nextAll);

    const orderList = nextAll.map((p, i) => ({ id: p.id, order: i }));
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    try {
      await reorder.mutateAsync({ orderList, token });
      enqueueSnackbar(
        t('adminProductsPage.snackbarReordered', {
          defaultValue: 'Products reordered',
        }) as string,
        { variant: 'success', autoHideDuration: 3000 },
      );
    } catch (err) {
      console.error('❌ Reorder failed', err);
      enqueueSnackbar(
        t('adminProductsPage.reorderFailed', {
          defaultValue: 'Failed to reorder products.',
        }) as string,
        { variant: 'error', autoHideDuration: 4000 },
      );
    }
  };

  const getCategoryName = (categoryId?: string | null) =>
    categories.find((c) => c.id === categoryId)?.name ?? '—';

  /** Apply filters (client-side guard) */
  const filteredProducts = useMemo<IProduct[]>(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    const cat = selectedCategoryId || '';
    const from = updatedFrom ? updatedFrom.startOf('day').toDate() : null;
    const to = updatedTo ? updatedTo.endOf('day').toDate() : null;

    return products.filter((raw) => {
      const p = raw as ProductLike;

      if (term) {
        const haystack = [
          p.name ?? '',
          p.title ?? '',
          p.description ?? '',
          String(p.id ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (cat && p.categoryId !== cat) return false;

      const price =
        typeof p.price === 'number'
          ? p.price
          : ((p as ProductLike)?.price ?? null);
      if (price !== null) {
        if (price < (minPrice ?? PRICE_MIN)) return false;
        if (price > (maxPrice ?? PRICE_MAX)) return false;
      }

      const stock =
        typeof p.stock === 'number'
          ? p.stock
          : ((p as ProductLike)?.stock ?? null);
      if (stock !== null) {
        if (stock < (minStock ?? STOCK_MIN)) return false;
        if (stock > (maxStock ?? STOCK_MAX)) return false;
      }

      const d =
        toDate((p as ProductLike).updatedAt) ??
        toDate((p as ProductLike).createdAt);
      if (from && d && d < from) return false;
      if (to && d && d > to) return false;

      return true;
    });
  }, [
    products,
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    updatedFrom,
    updatedTo,
  ]);

  /** Reset table + product filters + URL */
  const resetAll = useCallback(() => {
    setSorting([]);
    setColumnFilters([]);

    setSearchTerm('');
    setSelectedCategoryId('');
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinStock(STOCK_MIN);
    setMaxStock(STOCK_MAX);
    setUpdatedFrom(null);
    setUpdatedTo(null);

    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    clearAdminProductFiltersInSearchParams(next);
    if (params.toString() !== next.toString()) {
      setParams(next, { replace: true });
    }

    setReorderMode(false);
  }, [
    params,
    setParams,
    setSorting,
    setColumnFilters,
    setSearchTerm,
    setSelectedCategoryId,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
    setUpdatedFrom,
    setUpdatedTo,
  ]);

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <PageContainer>
        {/* Updated header: uses rightActions for "Add Product" */}
        <AdminHeaderBar
          title={t('adminProductsPage.title')}
          onReset={resetAll}
          rightActions={
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/admin/products/add')}
            >
              {t('adminProductsPage.addProduct', {
                defaultValue: 'Add Product',
              })}
            </Button>
          }
        />

        {/* Sticky controls: Filters + Reorder only */}
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
              onClick={resetAll}
            >
              {t('filters.reset')}
            </Button>

            <Button
              variant={reorderMode ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setReorderMode((m) => !m)}
              aria-label={reorderMode ? 'Reorder: On' : 'Reorder: Off'}
            >
              {reorderMode ? 'Reorder: On' : 'Reorder: Off'}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {loading ? (
          <LoadingProgress />
        ) : filteredProducts.length === 0 ? (
          <NotFound message={t('empty.noProducts')} />
        ) : (
          <StickyTable<IProduct>
            columns={columns}
            data={filteredProducts}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            renderGroupHeader={createCategoryGroupHeader(categories)}
            enablePagination
            enableSorting={!reorderMode}
            enableColumnFilters={false}
            groupById="categoryId"
            disableDrag={false}
            enableRowExpansion
            renderExpandedRow={(product) => (
              <ProductExpandedRow
                product={product}
                categoryName={getCategoryName(product.categoryId)}
              />
            )}
            bodyMaxHeight="60vh"
            onReorder={handleReorder}
            getRowId={(p) => p.id}
          />
        )}

        {/* Filters drawer */}
        <RightFiltersDrawer
          title={t('filters.open')}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <AdminProductFilters
            categories={categories}
            onClose={() => setFiltersOpen(false)}
          />
        </RightFiltersDrawer>

        {/* Confirm delete dialog */}
        <Dialog
          open={Boolean(toDelete)}
          onClose={() => (deleting ? null : setToDelete(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            {t('adminProductsPage.dialog.title', {
              defaultValue: 'Delete product?',
            })}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="warning" variant="outlined">
                {t('adminProductsPage.dialog.warning', {
                  defaultValue:
                    'This will permanently delete the product. This action cannot be undone.',
                })}
              </Alert>
              <Typography variant="body2">
                {t('adminProductsPage.dialog.confirm', {
                  name: toDelete?.name ?? toDelete?.id,
                  defaultValue: 'Are you sure you want to delete {{name}}?',
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
              {t('adminProductsPage.dialog.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              color="error"
              variant="contained"
            >
              {deleting
                ? t('adminProductsPage.dialog.deleting', {
                    defaultValue: 'Deleting…',
                  })
                : t('adminProductsPage.dialog.delete', {
                    defaultValue: 'Delete',
                  })}
            </Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </PageLayout>
  );
}
