import React, { useEffect, useReducer, useMemo } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';

import StickyTable from '../../components/StickyTable';
import LoadingProgress from '../../components/LoadingProgress';
import { fetchAllProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { IProduct } from '@common/types';
import { defineProductColumns as productColumns } from './Columns';
import { reducer, initialState } from './LocalReducer';

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

  const filteredProducts =
    state.selectedCategory === 'all'
      ? state.products
      : state.products.filter(
          (p) => String(p.categoryId) === state.selectedCategory,
        );

  const handleCategoryChange = (e: SelectChangeEvent) => {
    dispatch({ type: 'SET_CATEGORY', payload: e.target.value });
  };

  const columns = useMemo(
    () =>
      productColumns(categories, () =>
        dispatch({ type: 'SET_SNACKBAR', payload: true }),
      ),
    [categories],
  );

  if (state.loading) return <LoadingProgress />;

  return (
    <Box p={2}>
      {/* Category Filter */}
      <FormControl size="small" sx={{ mb: 2, width: 240 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={state.selectedCategory}
          onChange={handleCategoryChange}
        >
          <MenuItem value="all">All</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={String(cat.id)}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <StickyTable<IProduct>
        columns={columns}
        data={filteredProducts}
        sorting={state.sorting}
        onSortingChange={(s) => dispatch({ type: 'SET_SORTING', payload: s })}
        columnFilters={state.columnFilters}
        onColumnFiltersChange={(f) =>
          dispatch({ type: 'SET_FILTERS', payload: f })
        }
        enablePagination
        enableSorting
        enableColumnFilters
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
  );
}
