import React, { useEffect, useReducer, useMemo } from 'react';
import { Box, Snackbar, Alert, Divider } from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import StickyTable from '../../../components/StickyTable';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import { IProduct } from '@common/types';
import { defineProductColumns } from './Columns';
import { reducer, initialState } from './LocalReducer';
import { useCategories } from '../../../hooks/useCategories';
import { useProductMutations } from '../../../hooks/useProductMutations';
import { fetchAllProducts } from '../../../hooks/useProducts';
import { auth } from '../../../firebase';
import {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';

export default function AdminProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: categories = [] } = useCategories();
  const { reorder } = useProductMutations();

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const loadProducts = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const res = await fetchAllProducts();
        if (Array.isArray(res.data)) {
          dispatch({ type: 'SET_PRODUCTS', payload: res.data });
        } else {
          dispatch({ type: 'SET_PRODUCTS', payload: [] });
          console.error('❌ Invalid product response:', res.data);
        }
      } catch (err) {
        console.error('❌ Failed to load products:', err);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    void loadProducts();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = state.products.findIndex((p) => p.id === active.id);
    const newIndex = state.products.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(state.products, oldIndex, newIndex);
    dispatch({ type: 'SET_PRODUCTS', payload: reordered });

    const orderList = reordered.map((p, i) => ({ id: p.id, order: i }));
    const token = await auth.currentUser?.getIdToken();

    if (token) {
      try {
        await reorder.mutateAsync({ orderList, token });
        dispatch({ type: 'SET_SNACKBAR', payload: true });
      } catch (error) {
        console.error('❌ Reorder failed', error);
      }
    }
  };

  const columns = useMemo(
    () =>
      defineProductColumns(categories, () =>
        dispatch({ type: 'SET_SNACKBAR', payload: true }),
      ),
    [categories],
  );

  const sorting: SortingState = Array.isArray(state.sorting)
    ? state.sorting
    : [];

  const columnFilters: ColumnFiltersState = Array.isArray(state.columnFilters)
    ? state.columnFilters
    : [];

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newSorting =
      typeof updater === 'function' ? updater(sorting) : updater;
    dispatch({ type: 'SET_SORTING', payload: newSorting });
  };

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const newFilters =
      typeof updater === 'function' ? updater(columnFilters) : updater;
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  };

  if (state.loading) return <LoadingProgress />;
  if (state.products.length === 0)
    return <NotFound message="No products found." />;

  return (
    <Box px={2} py={1}>
      <Divider sx={{ mb: 2 }} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={state.products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <StickyTable<IProduct>
            columns={columns}
            data={state.products}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            enablePagination
            enableSorting
            enableColumnFilters
            groupById="categoryId"
          />
        </SortableContext>
      </DndContext>

      <Snackbar
        open={state.snackbarOpen}
        autoHideDuration={3000}
        onClose={() => dispatch({ type: 'SET_SNACKBAR', payload: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Product order updated
        </Alert>
      </Snackbar>
    </Box>
  );
}
