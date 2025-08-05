import React, { useEffect, useReducer, useMemo, useState } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material';

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
import ProductCard from '../../components/ProductCard';

export default function ProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: categories = [] } = useCategories();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Products</Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => {
              if (next) setViewMode(next);
            }}
            size="small"
          >
            <ToggleButton value="table">Table View</ToggleButton>
            <ToggleButton value="cards">Card View</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {viewMode === 'table' ? (
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
            enableRowExpansion={true}
          />
        ) : (
          <Box
            display="grid"
            gridTemplateColumns={{
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            }}
            gap={3}
          >
            {state.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Box>
        )}

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
