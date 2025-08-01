import React, { useEffect, useMemo, useState } from 'react';
import { Box, Snackbar, Alert, IconButton, Button } from '@mui/material';
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

  const columns = useMemo<ColumnDef<IProduct, any>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        enableColumnFilter: true,
      },
      {
        header: 'Category',
        accessorKey: 'categoryId',
        cell: ({ getValue }) => {
          const catId = getValue<number>();
          const cat = categories.find((c) => c.id === String(catId));
          return cat?.name || 'Unknown';
        },
        enableColumnFilter: true,
      },
      {
        header: 'Stock',
        accessorKey: 'stock',
        enableColumnFilter: true,
      },
      {
        header: 'Price',
        accessorKey: 'price',
        cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
        enableColumnFilter: true,
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <Button
            startIcon={<AddShoppingCartIcon />}
            size="small"
            variant="outlined"
            onClick={() => setSnackbarOpen(true)}
          >
            Add to Cart
          </Button>
        ),
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [categories],
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
