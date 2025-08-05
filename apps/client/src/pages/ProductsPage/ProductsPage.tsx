// src/pages/ProductsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

import StickyTable from '../../components/StickyTable';
import LoadingProgress from '../../components/LoadingProgress';
import { fetchAllProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { IProduct } from '@common/types';
import { defineProductColumns } from './Columns';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import ProductCard from './ProductCard';
import UserProductFilters from './UserProductFilters';
import { useProductStore } from '../../stores/useProductStore';
import {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';

export default function ProductsPage() {
  const {
    products,
    loading,
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    sorting,
    columnFilters,
    snackbarOpen,
    setProducts,
    setLoading,
    setSorting,
    setColumnFilters,
    setSnackbarOpen,
  } = useProductStore();

  const { data: categories = [] } = useCategories();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const res = await fetchAllProducts();
        if (Array.isArray(res.data)) {
          setProducts(res.data);
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
  }, [setProducts, setLoading]);

  const columns = useMemo(
    () => defineProductColumns(categories, () => setSnackbarOpen(true)),
    [categories, setSnackbarOpen],
  );

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newSorting =
      typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
  };

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const newFilters =
      typeof updater === 'function' ? updater(columnFilters) : updater;
    setColumnFilters(newFilters);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategoryId || product.categoryId === selectedCategoryId;
      const matchesCreatedAfter =
        !createdAfter || new Date(product.createdAt) >= createdAfter.toDate();
      const price = product.price ?? 0;
      const matchesPrice = price >= minPrice && price <= maxPrice;

      return (
        matchesSearch && matchesCategory && matchesCreatedAfter && matchesPrice
      );
    });
  }, [
    products,
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
  ]);

  if (loading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PRODUCTS}
    >
      <Box px={5} py={4}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          {viewMode === 'cards' && isMobile && (
            <IconButton onClick={() => setMobileFiltersOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}

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

        {viewMode === 'cards' && !isMobile && (
          <Box mb={2}>
            <UserProductFilters categories={categories} />
          </Box>
        )}

        {viewMode === 'cards' ? (
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
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Box>
        ) : (
          <StickyTable<IProduct>
            columns={columns}
            data={filteredProducts}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            enablePagination
            enableSorting
            enableColumnFilters
            groupById="categoryId"
            stickyColumnIndex={2}
            enableRowExpansion
          />
        )}

        {/* Drawer for mobile filters */}
        <Drawer
          anchor="left"
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        >
          <Box width={280} p={2}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={() => setMobileFiltersOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <UserProductFilters categories={categories} />
          </Box>
        </Drawer>

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
    </PageLayout>
  );
}
