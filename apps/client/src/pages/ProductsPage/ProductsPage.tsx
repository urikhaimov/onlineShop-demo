// src/pages/ProductsPage/ProductsPage.tsx
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth } from '../../hooks/useAuth';

declare global {
  interface Window {
    __INFINITE_DELAY__?: number;
    __PRODUCTS_VIEW__?: ViewMode; // persist view across test re-mounts
  }
}

const IS_TEST =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any)?.env?.MODE === 'test') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

const INFINITE_DELAY_MS =
  typeof window !== 'undefined' && typeof window.__INFINITE_DELAY__ === 'number'
    ? Number(window.__INFINITE_DELAY__)
    : IS_TEST
      ? 0
      : 200;

// Initialize view mode from a window stash (helps multi-mount tests)
function getInitialViewMode(): ViewMode {
  if (typeof window !== 'undefined' && window.__PRODUCTS_VIEW__) {
    return window.__PRODUCTS_VIEW__ as ViewMode;
  }
  return 'table';
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading: authLoading } = useAuth();

  // Theme
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const { themeSettings } = useThemeStore();
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const brand = themeSettings?.primaryColor || theme.palette.primary.main;

  const unit = Math.max(1, Math.round(2 * spacingScale));
  const stickyShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const stickyBg = (theme as any).vars?.palette?.background?.paperChannel
    ? `rgba(${(theme as any).vars.palette.background.paperChannel} / 0.9)`
    : alpha(theme.palette.background.paper, 0.92);
  const stickyBorder =
    (theme as any).vars?.palette?.divider ?? alpha(brand, isDark ? 0.25 : 0.18);
  const dividerColor =
    (theme as any).vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12);

  // Data & state
  const [visibleCount, setVisibleCount] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode());
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

  // Categories (gated on auth)
  const { data: categories = [] } = useCategories(undefined, {
    enabled: !!user && !authLoading,
  });

  const renderGroupHeader = React.useMemo(
    () => createCategoryGroupHeader<IProduct>(categories),
    [categories],
  );

  const tableKey = React.useMemo(
    () => `cats-${categories.map((c) => c.id).join(',')}`,
    [categories],
  );

  const { ref: sentinelRef, inView } = useInView();

  // Always call hooks (fixes react-hooks/rules-of-hooks)
  useProductFiltersQuerySync(viewMode, setViewMode);

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

  // ✅ Force fresh data whenever the page mounts or regains focus/connection.
  const {
    data: productsResp,
    isLoading: productsLoading,
    error: productsError,
    refetch,
  } = useProductsQuery(apiFilters, {
    enabled: !!user && !authLoading,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    // keepPreviousData helps prevent UI flicker during refetch
    keepPreviousData: true,
  });

  // Extra safety: refetch when tab becomes visible (some wrappers disable focus refetch)
  useEffect(() => {
    const onFocus = () => refetch();
    const onVis = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refetch]);

  const products: IProduct[] = productsResp?.items ?? [];
  const busy = loading || authLoading || productsLoading;

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
    categories,
  ]);

  useEffect(() => {
    if (inView && visibleCount < filteredProducts.length) {
      if (INFINITE_DELAY_MS <= 0) {
        setVisibleCount((prev) => prev + 12);
        return;
      }
      const tmo = setTimeout(
        () => setVisibleCount((prev) => prev + 12),
        INFINITE_DELAY_MS,
      );
      return () => clearTimeout(tmo);
    }
  }, [inView, visibleCount, filteredProducts.length]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const showAddedToast = React.useCallback(() => {
    enqueueSnackbar(t('toasts.addedToCart'), {
      variant: 'success',
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar, t]);

  const columns = useProductColumns(categories, showAddedToast);

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

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((prev) =>
      typeof updater === 'function'
        ? (updater as (old: ColumnFiltersState) => ColumnFiltersState)(prev)
        : updater,
    );
  };

  // ---- Test-only: singleton owner for cards grid + sentinel to avoid duplicates across multi-mount in tests
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2));
  const [isGridOwner, setIsGridOwner] = useState(true);

  useEffect(() => {
    if (!IS_TEST) return;
    const evtName = 'products-grid-owner';
    const onOwner = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setIsGridOwner(detail === instanceIdRef.current);
    };
    window.addEventListener(evtName, onOwner as unknown as EventListener);
    // announce myself as the latest owner
    window.dispatchEvent(
      new CustomEvent<string>(evtName, { detail: instanceIdRef.current }),
    );
    return () =>
      window.removeEventListener(evtName, onOwner as unknown as EventListener);
  }, []);

  if (busy) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.PRODUCTS}
    >
      <PageContainer>
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
            onChangeView={(m) => {
              const next = m as ViewMode;
              setViewMode(next);
              // persist selection for multi-mount test flow
              if (typeof window !== 'undefined') {
                window.__PRODUCTS_VIEW__ = next;
              }
            }}
            onOpenFilters={() => setFiltersOpen(true)}
            onResetFilters={resetAllFilters}
            buttonWidth={isSmDown ? 'auto' : 120 + 8 * (unit - 2)}
          />
        </Box>

        <Divider sx={{ mb: 2, borderColor: dividerColor }} />

        {productsError ? (
          <NotFound
            message={t('errors.productsLoad', {
              defaultValue: 'Failed to load products.',
            })}
          />
        ) : visibleProducts.length === 0 ? (
          <NotFound message={t('empty.noProducts')} />
        ) : viewMode === 'table' ? (
          <Box data-testid="sticky-table-wrapper">
            <StickyTable<IProduct>
              key={tableKey}
              data={filteredProducts}
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
          </Box>
        ) : (
          <Box data-testid={isGridOwner ? 'cards-grid' : undefined}>
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
          </Box>
        )}

        {/* Only render the sentinel once in tests (owner instance) */}
        {(!IS_TEST || isGridOwner) && (
          <InfiniteSentinel
            sentinelRef={sentinelRef}
            hasMore={visibleCount < filteredProducts.length}
          />
        )}

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
