// src/features/admin/products/AdminProductsPage.tsx
import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { Snackbar, Alert, Divider, Box, Button, Stack } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useNavigate, useSearchParams } from 'react-router-dom';

import StickyTable from '../../../components/StickyTable';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import type { IProduct } from '@common/types';
import { defineProductColumns } from './Columns';
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
  const {
    products,
    loading,
    snackbarOpen,
    sorting,
    columnFilters,
    setProducts,
    setProductsSorted,
    setLoading,
    setSnackbarOpen,
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
  const sensors = useSensors(useSensor(PointerSensor));
  const navigate = useNavigate();

  // Table ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Product filters ↔ URL
  useAdminProductFiltersQuerySync();

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
        }
      } catch (err) {
        console.error('❌ Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadProducts();
  }, [setLoading, setProducts, setProductsSorted]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);

    const orderList = reordered.map((p, i) => ({ id: p.id, order: i }));
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      try {
        await reorder.mutateAsync({ orderList, token });
        setSnackbarOpen(true);
      } catch (error) {
        console.error('❌ Reorder failed', error);
      }
    }
  };

  const columns = useMemo(
    () => defineProductColumns(categories, navigate),
    [categories, navigate],
  );

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
        typeof p.price === 'number' ? p.price : ((p as any)?.price ?? null);
      if (price !== null) {
        if (price < (minPrice ?? PRICE_MIN)) return false;
        if (price > (maxPrice ?? PRICE_MAX)) return false;
      }

      const stock =
        typeof p.stock === 'number' ? p.stock : ((p as any)?.stock ?? null);
      if (stock !== null) {
        if (stock < (minStock ?? STOCK_MIN)) return false;
        if (stock > (maxStock ?? STOCK_MAX)) return false;
      }

      const d = toDate((p as any).updatedAt) ?? toDate((p as any).createdAt);
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
        <AdminHeaderBar title="Admin Products" onReset={resetAll} />

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
              onClick={resetAll}
            >
              Reset filters
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {loading ? (
          <LoadingProgress />
        ) : filteredProducts.length === 0 ? (
          <NotFound message="No products found." />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredProducts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <StickyTable<IProduct>
                columns={columns}
                data={filteredProducts}
                sorting={sorting}
                onSortingChange={setSorting}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                enablePagination
                enableSorting
                enableColumnFilters={false} // filters live in the drawer
                groupById="categoryId"
                enableRowExpansion
                renderExpandedRow={(product) => (
                  <ProductExpandedRow
                    product={product}
                    categoryName={getCategoryName(product.categoryId)}
                  />
                )}
                bodyMaxHeight="60vh"
              />
            </SortableContext>
          </DndContext>
        )}

        {/* Filters drawer (stays open while editing) */}
        <RightFiltersDrawer
          title="Filters"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <AdminProductFilters
            categories={categories}
            onClose={() => setFiltersOpen(false)} // Apply on mobile closes it
          />
        </RightFiltersDrawer>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Product order updated
          </Alert>
        </Snackbar>
      </PageContainer>
    </PageLayout>
  );
}
