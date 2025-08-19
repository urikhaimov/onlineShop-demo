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
import {
  DEFAULT_MAX_PRICE,
  DEFAULT_MAX_STOCK,
  DEFAULT_MIN_PRICE,
  DEFAULT_MIN_STOCK,
} from './constants';

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

  // Convert many possible date shapes to a valid Date or undefined
  const toJsDate = (val: unknown): Date | undefined => {
    if (!val) return undefined;

    // Already a Date
    if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;

    // Firestore Timestamp-like { seconds, nanoseconds }
    if (typeof val === 'object' && val !== null) {
      const anyVal = val as any;
      if (typeof anyVal.seconds === 'number') {
        const ms =
          anyVal.seconds * 1000 +
          Math.floor((anyVal.nanoseconds ?? 0) / 1_000_000);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? undefined : d;
      }
      // ISO-like string nested in object (e.g., metadata.updatedAt)
      if (typeof anyVal.toDate === 'function') {
        const d = anyVal.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
      }
    }

    // String or number
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }

    return undefined;
  };

  const filteredProducts = useMemo(() => {
    const from = (updatedFrom as Dayjs | null)?.startOf('day')?.toDate();
    const to = (updatedTo as Dayjs | null)?.endOf('day')?.toDate();

    const term = (searchTerm ?? '').toString().trim().toLowerCase();

    return products.filter((p) => {
      const nameLc = (p?.name ?? '').toString().toLowerCase();
      const idLc = (p?.id ?? '').toString().toLowerCase();

      const matchesSearch =
        term.length === 0 || nameLc.includes(term) || idLc.includes(term);

      const matchesCategory =
        !selectedCategoryId || p.categoryId === selectedCategoryId;

      const updated = toJsDate(
        (p as any)?.updatedAt ?? (p as any)?.metadata?.updatedAt,
      );
      // Only apply date range if a product actually has an updated date
      const matchesUpdated =
        !updated || ((!from || updated >= from) && (!to || updated <= to));

      // Coerce numbers safely
      const priceNum =
        typeof p.price === 'number' ? p.price : Number(p.price ?? 0);
      const stockNum =
        typeof p.stock === 'number' ? p.stock : Number(p.stock ?? 0);

      const price = Number.isFinite(priceNum) ? priceNum : 0;
      const stock = Number.isFinite(stockNum) ? stockNum : 0;

      const minP = Number.isFinite(minPrice) ? minPrice : 0;
      const maxP = Number.isFinite(maxPrice)
        ? maxPrice
        : Number.MAX_SAFE_INTEGER;
      const minS = Number.isFinite(minStock) ? minStock : 0;
      const maxS = Number.isFinite(maxStock)
        ? maxStock
        : Number.MAX_SAFE_INTEGER;

      const matchesPrice = price >= minP && price <= maxP;
      const matchesStock = stock >= minS && stock <= maxS;

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

  // Reset visible window when filters change (prevents empty viewport after narrowing)
  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    viewMode,
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
  const resetStoreFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setUpdatedFrom(null);
    setUpdatedTo(null);
    setMinPrice(DEFAULT_MIN_PRICE);
    setMaxPrice(DEFAULT_MAX_PRICE);
    setMinStock(DEFAULT_MIN_STOCK);
    setMaxStock(DEFAULT_MAX_STOCK);
  };
  const resetAllFilters = () => {
    resetStoreFilters(); // store
    setSorting([]); // UI state
    setColumnFilters([]); // UI state
  };

  useEffect(() => {
    return () => {
      resetAllFilters();
    };
  }, []);
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
          <Box
            display="grid"
            alignItems="stretch"
            gap={2}
            sx={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflowX: 'clip',
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {visibleProducts.map((product) => (
              <Box key={product.id} sx={{ display: 'flex', minWidth: 0 }}>
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

            {/* Keep drawer open while changing filters */}
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
