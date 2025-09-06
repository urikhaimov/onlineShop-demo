// src/pages/AdminProductsPage/index.tsx
import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { Divider, Box, Button, Stack } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import StickyTable from '../../../components/StickyTable';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import type { IProduct } from '@common/types';
import { useProductColumns } from './Columns';
import { useCategories } from '../../../hooks/useCategories';
import { useProductMutations } from '../../../hooks/useProductMutations';
import { fetchAllProducts } from '../../../hooks/useProducts';
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

  const { data: categories = [] } = useCategories();
  const { reorder } = useProductMutations();
  const isReordering = reorder.isPending;
  const navigate = useNavigate();

  // ✅ Build columns with locale-aware hook (no hooks inside the builder)
  const columns = useProductColumns(categories, navigate);

  // Table ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Product filters ↔ URL
  useAdminProductFiltersQuerySync();

  // NEW: Reorder mode toggle — drag is OFF by default to keep links & row actions clickable
  const [reorderMode, setReorderMode] = React.useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const res = await fetchAllProducts();
        if (Array.isArray(res.data)) {
          setProductsSorted(res.data);
        } else {
          setProducts([]);
          console.error('❌ Invalid product response:', res.data);
          enqueueSnackbar(
            t('adminProductsPage.loadFailed', {
              defaultValue: 'Failed to load products.',
            }) as string,
            {
              variant: 'error',
              autoHideDuration: 4000,
            },
          );
        }
      } catch (err) {
        console.error('❌ Failed to load products:', err);
        enqueueSnackbar(
          t('adminProductsPage.loadFailed', {
            defaultValue: 'Failed to load products.',
          }) as string,
          {
            variant: 'error',
            autoHideDuration: 4000,
          },
        );
      } finally {
        setLoading(false);
      }
    };
    void loadProducts();
  }, [setLoading, setProducts, setProductsSorted, enqueueSnackbar, t]);

  // ---- Reorder wiring (called by StickyTable with visible ordered IDs)
  const byId = React.useMemo(() => {
    const m = new Map<string, IProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const handleReorder = async (orderedIds: string[]) => {
    const visibleSet = new Set(orderedIds);
    const nextVisible = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    const rest = products.filter((p) => !visibleSet.has(p.id));

    const nextAll = [...nextVisible, ...rest];
    setProducts(nextAll); // optimistic

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
      // Optional: rollback
      // setProducts(products);
    }
  };
  // ---------------------------------------------

  const getCategoryName = (categoryId?: string | null) =>
    categories.find((c) => c.id === categoryId)?.name ?? '—';

  /** Apply filters (client-side) */
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

  /** Reset table + product filters + URL (same UX as Orders) */
  const resetAll = React.useCallback(() => {
    // Table
    setSorting([]);
    setColumnFilters([]);

    // Filters (store)
    setSearchTerm('');
    setSelectedCategoryId('');
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinStock(STOCK_MIN);
    setMaxStock(STOCK_MAX);
    setUpdatedFrom(null);
    setUpdatedTo(null);

    // URL
    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    clearAdminProductFiltersInSearchParams(next);
    if (params.toString() !== next.toString()) {
      setParams(next, { replace: true });
    }

    // Also leave reorder mode to avoid accidental drags after reset
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
        <AdminHeaderBar
          title={t('adminProductsPage.title')}
          onReset={resetAll}
        />

        {/* Controls (always visible) */}
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
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => setFiltersOpen(true)}
              >
                {t('filters.open')}
              </Button>

              {/* Reorder mode toggle */}
              <Button
                variant={reorderMode ? 'contained' : 'outlined'}
                size="small"
                startIcon={<SwapVertIcon />}
                onClick={() => setReorderMode((v) => !v)}
              >
                {reorderMode
                  ? t('adminProductsPage.reorderOn', {
                      defaultValue: 'Reorder: ON',
                    })
                  : t('adminProductsPage.reorderOff', {
                      defaultValue: 'Reorder: OFF',
                    })}
              </Button>
            </Stack>

            {/* Add Product */}
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
          </Stack>
        </Box>

        {/* Optional hint when reorder mode is enabled */}
        {reorderMode && (
          <Box sx={{ mb: 2 }}>
            {/* Keeping this as an inline hint; replace with snackbar if preferred */}
            {/* or use enqueueSnackbar when toggled on */}
          </Box>
        )}

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
            enablePagination
            enableSorting
            enableColumnFilters={false} // drawer holds filters
            groupById="categoryId"
            disableDrag={!reorderMode}
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

        {/* Filters drawer (stays open while editing) */}
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
      </PageContainer>
    </PageLayout>
  );
}
