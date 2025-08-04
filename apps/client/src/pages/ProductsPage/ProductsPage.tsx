import React, { useEffect, useReducer, useMemo } from 'react';
import { Box, Snackbar, Alert, Divider } from '@mui/material';

import StickyTable from '../../components/StickyTable';
import LoadingProgress from '../../components/LoadingProgress';
import { fetchAllProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { IProduct } from '@common/types';
import { defineProductColumns } from './Columns';
import { reducer, initialState } from './LocalReducer';
import {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';

export default function ProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: categories = [] } = useCategories();

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

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PRODUCTS}
    >
      <Box px={2} py={1}>
        <Divider sx={{ mb: 2 }} />

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
          stickyColumnIndex={2}
        />

        <Snackbar
          open={state.snackbarOpen}
          autoHideDuration={3000}
          onClose={() => dispatch({ type: 'SET_SNACKBAR', payload: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Product added to cart
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  );
}
