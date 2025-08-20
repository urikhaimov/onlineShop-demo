import React, { useEffect, useMemo, useState } from 'react';
import { Box, Divider, Snackbar, Alert, Typography } from '@mui/material';
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
import TopActionBar, { ViewMode } from '../../components/TopActionBar';

import PageContainer from '../../components/PageContainer';
import ResponsiveCardsGrid from '../../components/ResponsiveCardsGrid';
import RightFiltersDrawer from '../../components/RightFiltersDrawer';
import InfiniteSentinel from '../../components/InfiniteSentinel';
import { toJsDate } from '../../utils/toJsDate';

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
      const matchesUpdated =
        !updated || ((!from || updated >= from) && (!to || updated <= to));

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

  // Reset visible window when filters change
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
    resetStoreFilters();
    setSorting([]);
    setColumnFilters([]);
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
      <PageContainer>
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
          <TopActionBar
            viewMode={viewMode as ViewMode}
            onChangeView={(m) => setViewMode(m as ViewMode)}
            onOpenFilters={() => setFiltersOpen(true)}
            onResetFilters={resetAllFilters}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Main content */}
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
          <ResponsiveCardsGrid>
            {visibleProducts.map((product) => (
              <Box key={product.id} sx={{ display: 'flex', minWidth: 0 }}>
                <ProductCard
                  product={product}
                  onAddToCart={() => setSnackbarOpen(true)}
                />
              </Box>
            ))}
          </ResponsiveCardsGrid>
        )}

        {/* Infinite scroll sentinel */}
        <InfiniteSentinel
          sentinelRef={sentinelRef}
          hasMore={visibleCount < filteredProducts.length}
        />

        {/* Filters Drawer */}
        <RightFiltersDrawer
          title="Filters"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <UserProductFilters
            categories={categories}
            onClose={() => setFiltersOpen(false)}
            closeOnChange={false}
          />
        </RightFiltersDrawer>

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
      </PageContainer>
    </PageLayout>
  );
}
