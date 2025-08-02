import React, { useEffect, useMemo, useState } from 'react';
import { Box, Snackbar, Alert, CardMedia, Button } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';

import { fetchAllProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { IProduct } from '@common/types';
import StickyTable from '../../components/StickyTable';
import LoadingProgress from '../../components/LoadingProgress';
import { defineProductColumns } from './Columns';
export default function ProductsPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: categories = [] } = useCategories();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchAllProducts();
        if (!Array.isArray(res.data)) {
          console.error('❌ Invalid product response:', res.data);
          setProducts([]);
        } else {
          setProducts(res.data);
        }
      } catch (err) {
        console.error('❌ Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const columns = useMemo(
    () => defineProductColumns(categories, setSnackbarOpen),
    [],
  );

  if (loading) return <LoadingProgress />;

  return (
    <Box p={2}>
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
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Product added to cart
        </Alert>
      </Snackbar>
    </Box>
  );
}
