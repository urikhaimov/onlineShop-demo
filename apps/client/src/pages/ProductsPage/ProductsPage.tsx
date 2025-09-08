// src/pages/ProductsPage.tsx
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Box, Divider, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useInView } from 'react-intersection-observer';

import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import type { IProduct } from '@common/types';
import StickyTable from '../../components/StickyTable';
import { useProductColumns } from './Columns';
import NotFound from '../../components/NotFound';
import type {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';

import { useStickyTableQuerySync } from '../../hooks/useStickyTableQuerySync';
import { useProductFiltersQuerySync } from '../../hooks/useProductFiltersQuerySync';
import { useProductsQuery } from '../../hooks/useProductsQuery';

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
import { useTranslation } from 'react-i18next';
import LoadingProgress from '@client/components/LoadingProgress';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSnackbar } from 'notistack';
import { createCategoryGroupHeader } from './CategoryGroupHeader';

// 👇 NEW: gate queries on auth readiness to avoid 401s
import { useAuth } from '../../context/AuthContext';

export default function ProductsPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  // Auth gate
  const { user, loading: authLoading } = useAuth();

  // 🧩 Theme + Theme Store
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const { themeSettings } = useThemeStore();

  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const brand = themeSettings?.primaryColor || theme.palette.primary.main;

  // Derived tokens (scalar-friendly for sx)
  const unit = Math.max(1, Math.round(2 * spacingScale));
  const stickyShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const stickyBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 0.9)`
    : alpha(theme.palette.background.paper, 0.92);
  const stickyBorder =
    theme.vars?.palette?.divider ?? alpha(brand, isDark ? 0.25 : 0.18);
  const dividerColor =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12);

  // Data & state
  const [visibleCount, setVisibleCount] = useState(20);

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
    loading,
  } = useProductStore();

  // 🔹 Load categories BEFORE using them (gated on auth)
  const { data: categories = [] } = useCategories(undefined, {
    enabled: !!user && !authLoading,
  });

  // 🔹 Group header renderer (uses categories)
  const renderGroupHeader = React.useMemo(
    () => createCategoryGroupHeader<IProduct>(categories),
    [categories],
  );

  // 🔹 Force table re-render when category list changes (fixes header mismatch)
  const tableKey = React.useMemo(
    () => `cats-${categories.map((c) => c.id).join(',')}`,
    [categories],
  );

  const { ref: sentinelRef, inView } = useInView();

  useProductFiltersQuerySync(viewMode, setViewMode);

  // Build filters once per dependency change
  const apiFilters = useMemo(
    () => ({
      q: (searchTerm ?? '').trim() || undefined,
      categoryId: selectedCategoryId || undefined,
      priceMin: minPrice,
      priceMax: maxPrice,
      stockMin: minStock,
      stockMax: maxStock,
      limit: 500,
      page: 1,
    }),
    [searchTerm, selectedCategoryId, minPrice, maxPrice, minStock, maxStock],
  );

  // 🔹 Fetch products via API (gated on auth)
  const {
    data: productsResp,
    isLoading: productsLoading,
    error: productsError,
  } = useProductsQuery(apiFilters, { enabled: !!user && !authLoading });

  const products: IProduct[] = productsResp?.items ?? [];
  const busy = loading || authLoading || productsLoading;

  // Filtering (kept client-side to preserve existing UX)
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
        (p as { updatedAt?: Date; metadata?: { updatedAt?: Date } })?.metadata
          ?.updatedAt,
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

  // Reset visible window when filters/categories change
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
    categories, // 👈 ensures reset when categories arrive
  ]);

  // Infinite load window (client-side slice)
  useEffect(() => {
    if (inView && visibleCount < filteredProducts.length) {
      const tmo = setTimeout(() => setVisibleCount((prev) => prev + 12), 200);
      return () => clearTimeout(tmo);
    }
  }, [inView, visibleCount, filteredProducts.length]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  // ✅ Proper () => void callback for columns to trigger a toast
  const showAddedToast = React.useCallback(() => {
    enqueueSnackbar(t('toasts.addedToCart'), {
      variant: 'success',
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar, t]);

  // Locale-aware columns (pass toast trigger)
  const columns = useProductColumns(categories, showAddedToast);

  // URL sync for table state
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // Reset helpers
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

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((prev) =>
      typeof updater === 'function'
        ? (updater as (old: ColumnFiltersState) => ColumnFiltersState)(prev)
        : updater,
    );
  };

  if (busy) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PRODUCTS}
    >
      <PageContainer>
        {/* Sticky header controls — theme-aware */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            bgcolor: stickyBg,
            backdropFilter: 'saturate(140%) blur(8px)',
            borderBottom: `1px solid ${stickyBorder}`,
            py: Math.max(1, unit * 0.5),
            px: { xs: 1, sm: 2 },
            mb: 1,
            borderRadius: { xs: 0, sm: radius },
            boxShadow: stickyShadow,
          }}
        >
          <TopActionBar
            viewMode={viewMode as ViewMode}
            onChangeView={(m) => setViewMode(m as ViewMode)}
            onOpenFilters={() => setFiltersOpen(true)}
            onResetFilters={resetAllFilters}
            buttonWidth={isSmDown ? 'auto' : 120 + 8 * (unit - 2)}
          />
        </Box>

        <Divider sx={{ mb: 2, borderColor: dividerColor }} />

        {/* Main content */}
        {productsError ? (
          <NotFound
            // you can localize this key if you like
            message={t('errors.productsLoad', {
              defaultValue: 'Failed to load products.',
            })}
          />
        ) : visibleProducts.length === 0 ? (
          <NotFound message={t('empty.noProducts')} />
        ) : viewMode === 'table' ? (
          <StickyTable<IProduct>
            key={tableKey}
            data={visibleProducts}
            columns={columns}
            sorting={sorting}
            onSortingChange={setSorting}
            enableColumnFilters={false}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            groupById="categoryId"
            renderGroupHeader={renderGroupHeader}
            enablePagination
            enableSorting
            enableRowExpansion
            renderExpandedRow={(product) => (
              <ProductExpandedRow product={product} />
            )}
            bodyMaxHeight="60vh"
          />
        ) : (
          <ResponsiveCardsGrid>
            {visibleProducts.map((product) => (
              <Box key={product.id} sx={{ display: 'flex', minWidth: 0 }}>
                <ProductCard
                  product={product}
                  onAddToCart={() =>
                    enqueueSnackbar(t('toasts.addedToCart'), {
                      variant: 'success',
                      autoHideDuration: 3000,
                    })
                  }
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
          title={t('filters.open')}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <UserProductFilters
            categories={categories}
            onClose={() => setFiltersOpen(false)}
            closeOnChange={false}
          />
        </RightFiltersDrawer>
      </PageContainer>
    </PageLayout>
  );
}
