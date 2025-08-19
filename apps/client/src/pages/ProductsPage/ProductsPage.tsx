// src/pages/ProductsPage/ProductsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Divider,
  Snackbar,
  Alert,
  Button,
  Stack,
  Drawer,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';

import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import type { IProduct } from '@common/types';
import { db } from '../../firebase';
import StickyTable from '../../components/StickyTable';
import { defineProductColumns } from './Columns';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import type {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';

import { useStickyTableQuerySync } from '../../hooks/useStickyTableQuerySync';
import { useProductFiltersQuerySync } from '../../hooks/useProductFiltersQuerySync';

import type { Dayjs } from 'dayjs';
import { useCategories } from '../../hooks/useCategories';
import ProductExpandedRow from './ProductExpandedRow';
import { PageLayout } from '../../layouts/page.layout';

import UserProductFilters from './UserProductFilters';
import { useProductStore } from '../../stores/useProductStore';
import ProductCard from './ProductCard';

type ViewMode = 'table' | 'cards';

export default function ProductsPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    setSearchTerm,
    setSelectedCategoryId,
    setUpdatedFrom,
    setUpdatedTo,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
  } = useProductStore();

  const { data: categories = [] } = useCategories();
  const { ref: sentinelRef, inView } = useInView();

  useProductFiltersQuerySync(viewMode, setViewMode);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order'));
    const debouncedSet = debounce(
      (items: IProduct[]) => setProducts(items),
      300,
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs: IProduct[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as IProduct),
        id: doc.id,
      }));
      debouncedSet(docs);
    });

    return () => {
      unsub();
      debouncedSet.cancel();
    };
  }, []);

  const toJsDate = (val: unknown): Date | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof val === 'object' && val !== null && 'seconds' in (val as any)) {
      const ts = val as { seconds: number; nanoseconds?: number };
      const d = new Date(
        ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1_000_000),
      );
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };

  const filteredProducts = useMemo(() => {
    const from = (updatedFrom as Dayjs | null)?.startOf('day')?.toDate();
    const to = (updatedTo as Dayjs | null)?.endOf('day')?.toDate();

    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategoryId || p.categoryId === selectedCategoryId;

      const updated = toJsDate(
        (p as any)?.updatedAt ?? (p as any)?.metadata?.updatedAt,
      );
      const matchesUpdated =
        !updated || ((!from || updated >= from) && (!to || updated <= to));

      const price = typeof p.price === 'number' ? p.price : 0;
      const stock = typeof p.stock === 'number' ? p.stock : 0;

      const matchesPrice = price >= minPrice && price <= maxPrice;
      const matchesStock = stock >= minStock && stock <= maxStock;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesUpdated &&
        matchesPrice &&
        matchesStock
      );
    });
  }, [
    products,
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
  ]);

  useEffect(() => {
    if (inView && visibleCount < filteredProducts.length) {
      const t = setTimeout(() => setVisibleCount((prev) => prev + 12), 200);
      return () => clearTimeout(t);
    }
  }, [inView, visibleCount, filteredProducts.length]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const columns = useMemo(
    () => defineProductColumns(categories, setSnackbarOpen),
    [categories],
  );

  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setUpdatedFrom(null);
    setUpdatedTo(null);
    setMinPrice(0);
    setMaxPrice(100000);
    setMinStock(0);
    setMaxStock(1000);
    setSorting([]);
    setColumnFilters([]);
  };

  const getCategoryName = (categoryId?: string | null) =>
    categories.find((c) => c.id === categoryId)?.name ?? '—';

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((prev) =>
      typeof updater === 'function' ? (updater as any)(prev) : updater,
    );
  };

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PRODUCTS}
    >
      <Box px={5} py={4}>
        {/* Sticky header controls */}
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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            flexWrap="wrap"
          >
            <Stack direction="row" gap={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => setFiltersOpen(true)}
                startIcon={<FilterListIcon />}
              >
                Filters
              </Button>

              <Button size="small" variant="outlined" onClick={resetAllFilters}>
                Reset filters
              </Button>
            </Stack>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="table" aria-label="Table view">
                <TableRowsIcon sx={{ mr: 0.5 }} />
                Table
              </ToggleButton>
              <ToggleButton value="cards" aria-label="Cards view">
                <GridViewIcon sx={{ mr: 0.5 }} />
                Cards
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Main content: Table or Cards */}
        {filteredProducts.length === 0 ? (
          <NotFound message="No products found." />
        ) : viewMode === 'table' ? (
          <StickyTable<IProduct>
            data={visibleProducts}
            columns={columns}
            sorting={sorting}
            onSortingChange={setSorting}
            enableColumnFilters={false}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            groupById="categoryId"
            enablePagination
            enableSorting
            enableRowExpansion
            renderExpandedRow={(product) => (
              <ProductExpandedRow
                product={product}
                categoryName={getCategoryName(product.categoryId)}
              />
            )}
            bodyMaxHeight="60vh"
          />
        ) : (
          // ✅ Cards layout with Box (CSS grid)
          <Box
            display="grid"
            gap={2}
            alignItems="stretch"
            gridTemplateColumns={{
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            }}
          >
            {visibleProducts.map((product) => (
              <Box key={product.id} display="flex">
                <ProductCard
                  product={product}
                  onAddToCart={() => setSnackbarOpen(true)}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Infinite scroll sentinel */}
        <Box ref={sentinelRef} display="flex" justifyContent="center" py={3}>
          {visibleCount < filteredProducts.length && <LoadingProgress />}
        </Box>

        {/* Drawer for Filters */}
        <Drawer
          anchor="right"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 360 } } }}
        >
          <Box p={2}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Filters
            </Typography>
            <UserProductFilters categories={categories} />
            <Stack direction="row" gap={1} justifyContent="flex-end" mt={2}>
              <Button variant="outlined" onClick={resetAllFilters}>
                Reset
              </Button>
              <Button variant="contained" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </Stack>
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
