import React, { useEffect, useMemo } from 'react';
import { Box, Snackbar, Alert, Divider } from '@mui/material';
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
import { useNavigate } from 'react-router-dom';

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
  } = useAdminProductsStore();

  const { data: categories = [] } = useCategories();
  const { reorder } = useProductMutations();
  const sensors = useSensors(useSensor(PointerSensor));
  const navigate = useNavigate();

  // Load products
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

  // Drag to reorder
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

  // Columns (with mobile-hide meta + actions)
  const columns = useMemo(
    () => defineProductColumns(categories, navigate),
    [categories, navigate],
  );

  // Sync sorting + column filters with the URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Helper to resolve category display name for expanded row
  const getCategoryName = (categoryId?: string | null) =>
    categories.find((c) => c.id === categoryId)?.name ?? '—';

  if (loading) return <LoadingProgress />;
  if (products.length === 0) return <NotFound message="No products found." />;

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={2} py={1}>
        <Divider sx={{ mb: 2 }} />

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={products.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <StickyTable<IProduct>
              columns={columns}
              data={products}
              sorting={sorting}
              onSortingChange={setSorting}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              enablePagination
              enableSorting
              enableColumnFilters
              groupById="categoryId"
              enableRowExpansion
              renderExpandedRow={(product) => (
                <ProductExpandedRow
                  product={product}
                  categoryName={getCategoryName(product.categoryId)}
                />
              )}
            />
          </SortableContext>
        </DndContext>

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
      </Box>
    </PageLayout>
  );
}
