import React, { useEffect, useReducer, useMemo, useState } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  Divider,
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
import ProductCard from './ProductCard';
import UserProductFilters from './UserProductFilters';

export default function ProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: categories = [] } = useCategories();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  const filteredProducts = useMemo(() => {
    return state.products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(state.searchTerm.toLowerCase());
      const matchesCategory =
        !state.selectedCategoryId ||
        product.categoryId === state.selectedCategoryId;
      const matchesCreatedAfter =
        !state.createdAfter ||
        new Date(product.createdAt) >= state.createdAfter.toDate();
      const price = product.price ?? 0;
      const matchesPrice = price >= state.minPrice && price <= state.maxPrice;

      return (
        matchesSearch && matchesCategory && matchesCreatedAfter && matchesPrice
      );
    });
  }, [
    state.products,
    state.searchTerm,
    state.selectedCategoryId,
    state.createdAfter,
    state.minPrice,
    state.maxPrice,
  ]);

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
            <UserProductFilters
              filters={state}
              dispatch={dispatch}
              categories={categories}
            />
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
            <UserProductFilters
              filters={state}
              dispatch={dispatch}
              categories={categories}
            />
          </Box>
        </Drawer>

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
