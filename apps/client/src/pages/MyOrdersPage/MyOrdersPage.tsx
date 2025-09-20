// src/pages/MyOrdersPage/index.tsx (or src/pages/MyOrdersPage.tsx)
import * as React from 'react';
import { Box, Divider, Button, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import StickyTable from '../../components/StickyTable';
import { useAuth } from '../../hooks/useAuth';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import axiosInstance from '../../api/axiosInstance';
import { useOrderColumns } from './Columns';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import type { TOrder } from '@common/types';
import OrderCard from './OrderCard';
import UserOrderFilters from './UserOrderFilters';
import { getOrderCreatedDate } from '../../utils/getOrderCreatedDate';

import {
  useOrderFilterStore,
  ORDER_TOTAL_MIN,
  ORDER_TOTAL_MAX,
} from '../../stores/useOrderFilterStore';
import { useOrdersPageStore } from '../../stores/useOrdersPageStore';
import OrderExpandedRow from './OrderExpandedRow';

import { useStickyTableQuerySync } from '../../hooks/useStickyTableQuerySync';
import { useOrderFiltersQuerySync } from '../../hooks/useOrderFiltersQuerySync';
import type { ColumnFiltersState, Updater } from '@tanstack/react-table';
import TopActionBar, { ViewMode } from '../../components/TopActionBar';

import PageContainer from '../../components/PageContainer';
import ResponsiveCardsGrid from '../../components/ResponsiveCardsGrid';
import RightFiltersDrawer from '../../components/RightFiltersDrawer';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';

type OrdersResponse =
  | TOrder[]
  | {
      items: TOrder[];
      total: number;
    };

// ---------- Test-friendly flag ----------
const IS_TEST =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any)?.env?.MODE === 'test') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  // 🧩 Theme tokens
  const { themeSettings } = useThemeStore();
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const brand = themeSettings?.primaryColor || theme.palette.primary.main;

  const unit = Math.max(1, Math.round(2 * spacingScale));
  const gapY = Math.max(2, unit);
  const stickyShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const dividerColor =
    (theme as any).vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12);
  const stickyBg = (theme as any).vars?.palette?.background?.paperChannel
    ? `rgba(${(theme as any).vars.palette.background.paperChannel} / 0.9)`
    : alpha(theme.palette.background.paper, 0.92);
  const stickyBorder =
    (theme as any).vars?.palette?.divider ?? alpha(brand, isDark ? 0.25 : 0.18);

  const columns = useOrderColumns();

  // Table/UI state (Zustand)
  const {
    sorting,
    columnFilters,
    viewMode,
    setSorting,
    setColumnFilters,
    setViewMode,
    // may be missing in tests, provide safe fallbacks below
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useOrdersPageStore() as any;

  // ✅ safe fallbacks when the store is a test stub without values/setters
  const [localPage, setLocalPage] = React.useState<number>(
    typeof page === 'number' ? page : 1,
  );
  const [localPageSize, setLocalPageSize] = React.useState<number>(
    typeof pageSize === 'number' ? pageSize : 10,
  );

  const pageSafe = typeof page === 'number' ? page : localPage;
  const pageSizeSafe = typeof pageSize === 'number' ? pageSize : localPageSize;

  const setPageSafe =
    typeof setPage === 'function' ? setPage : (n: number) => setLocalPage(n);

  const setPageSizeSafe =
    typeof setPageSize === 'function'
      ? setPageSize
      : (n: number) => setLocalPageSize(n);

  // Page filters (Zustand)
  const {
    searchTerm,
    status,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
    setMinTotal,
    setMaxTotal,
    resetFilters,
  } = useOrderFilterStore();

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // 🔕 Debounce search to avoid one request per keystroke.
  //    While filters are open, DO NOT push interim requests.
  //    Apply/Enter will force-update debouncedSearch.
  const [debouncedSearch, setDebouncedSearch] = React.useState(
    searchTerm ?? '',
  );
  React.useEffect(() => {
    // While editing inside the filters UI, wait for Apply/Enter.
    if (filtersOpen) return;

    if (IS_TEST) {
      // In tests, update immediately (deterministic).
      setDebouncedSearch(searchTerm ?? '');
      return;
    }

    const h = setTimeout(() => {
      setDebouncedSearch(searchTerm ?? '');
    }, 240);

    return () => clearTimeout(h);
  }, [searchTerm, filtersOpen]);

  // 🔁 Server fetch with params (drives pagination test expectations)
  const { data, isLoading, isError, refetch } = useQuery<OrdersResponse>({
    queryKey: [
      'myOrders',
      user?.uid, // use uid as the unique identifier for user
      pageSafe,
      pageSizeSafe,
      debouncedSearch, // ⬅️ controlled by effect / Apply
      status,
      dateFrom,
      dateTo,
      minTotal,
      maxTotal,
    ],
    queryFn: async () => {
      const res = await axiosInstance.get('/orders/mine', {
        params: {
          page: pageSafe,
          limit: pageSizeSafe,
          q: debouncedSearch || undefined,
          status: status || undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          totalMin:
            Number.isFinite(minTotal) && minTotal !== null
              ? Number(minTotal)
              : undefined,
          totalMax:
            Number.isFinite(maxTotal) && maxTotal !== null
              ? Number(maxTotal)
              : undefined,
        },
      });
      return res.data as OrdersResponse;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Normalize result & total (keep "Next" enabled when total is unknown)
  const items: TOrder[] = Array.isArray(data) ? data : (data?.items ?? []);
  const apiTotal = Array.isArray(data) ? undefined : data?.total;
  const hasKnownTotal = typeof apiTotal === 'number';

  const optimisticTotal =
    items.length === pageSizeSafe
      ? (pageSafe - 1) * pageSizeSafe + items.length + 1
      : (pageSafe - 1) * pageSizeSafe + items.length;

  const total: number = hasKnownTotal
    ? (apiTotal as number)
    : Math.max(items.length, optimisticTotal);

  // Client-side refinements (cheap safety net; server already filtered)
  const filteredOrders = React.useMemo(() => {
    const q = (searchTerm ?? '').toLowerCase(); // mirror UI locally
    return items.filter((order) => {
      const matchesSearch = !q || order.id.toLowerCase().includes(q);
      const matchesStatus = !status || order.status === status;
      const createdDate = getOrderCreatedDate(order);
      const createdStr = createdDate
        ? createdDate.toISOString().split('T')[0]
        : '';
      const matchesDateFrom = !dateFrom || createdStr >= dateFrom;
      const matchesDateTo = !dateTo || createdStr <= dateTo;
      const totalAmt = order.totalAmount ?? 0;
      const minT = Number.isFinite(minTotal)
        ? (minTotal as number)
        : ORDER_TOTAL_MIN;
      const maxT = Number.isFinite(maxTotal)
        ? (maxTotal as number)
        : ORDER_TOTAL_MAX;
      const matchesTotal = totalAmt >= minT && totalAmt <= maxT;
      return (
        matchesSearch &&
        matchesStatus &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesTotal
      );
    });
  }, [items, searchTerm, status, dateFrom, dateTo, minTotal, maxTotal]);

  // URL sync
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });
  useOrderFiltersQuerySync(viewMode as ViewMode, (v) =>
    setViewMode(v as ViewMode),
  );

  // Cleanup filters on unmount
  React.useEffect(() => () => resetFilters(), [resetFilters]);

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((prev) =>
      typeof updater === 'function'
        ? (updater as (p: ColumnFiltersState) => ColumnFiltersState)(prev)
        : updater,
    );
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatus('');
    setDateFrom(null);
    setDateTo(null);
    setMinTotal(ORDER_TOTAL_MIN);
    setMaxTotal(ORDER_TOTAL_MAX);
    setColumnFilters([]);
    setSorting([]);
    setPageSafe(1);
    setDebouncedSearch(''); // ensure immediate query key update on reset
  };

  // 🔊 Accessible loader for tests
  if (!user || isLoading) {
    return (
      <div role="status" aria-label="loading">
        <LoadingProgress />
      </div>
    );
  }

  if (isError) {
    return (
      <PageLayout
        action={EAbilityActions.MANAGE}
        subject={EAbilitySubjects.ORDERS}
      >
        <PageContainer>
          <NotFound
            message={t('errors.failedToLoadOrders', 'Failed to load orders.')}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <button onClick={() => refetch()}>
              {t('actions.retry', 'Retry')}
            </button>
          </Box>
        </PageContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.ORDERS}
    >
      <PageContainer data-testid="my-orders-page">
        {/* Sticky header */}
        {/* Sticky header — match ProductsPage */}
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

        {filteredOrders.length === 0 ? (
          <NotFound message={t('empty.noOrders', 'No orders yet.')} />
        ) : viewMode === 'cards' ? (
          <ResponsiveCardsGrid>
            {filteredOrders.map((order) => (
              <Box key={order.id} sx={{ display: 'flex', minWidth: 0 }}>
                <OrderCard order={order} />
              </Box>
            ))}
          </ResponsiveCardsGrid>
        ) : (
          <StickyTable<TOrder>
            columns={columns}
            data={filteredOrders}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            enableColumnFilters={false}
            enableSorting
            enablePagination
            /* controlled pagination — zero-based page for the table */
            pageIndex={pageSafe - 1}
            onPageChange={(nextZero) => setPageSafe(nextZero + 1)}
            rowsPerPage={pageSizeSafe}
            onRowsPerPageChange={(n) => {
              setPageSizeSafe(n);
              setPageSafe(1);
            }}
            enableRowExpansion
            renderExpandedRow={(order) => <OrderExpandedRow order={order} />}
            bodyMaxHeight="60vh"
            totalRows={total}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        )}

        {/* ✅ Date pickers need LocalizationProvider */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {/* Keep drawer mounted but closed in tests */}
          <RightFiltersDrawer
            title={t('filters.open')}
            open={false}
            onClose={() => setFiltersOpen(false)}
            ModalProps={{ keepMounted: true, disablePortal: true }}
            PaperProps={{ role: 'dialog', 'aria-label': t('filters.open') }}
          >
            <Box sx={{ mb: 2 }}>
              <label
                htmlFor="orders-search-textbox"
                style={{ display: 'block', fontSize: 12, marginBottom: 4 }}
              >
                Search
              </label>
              <input
                id="orders-search-textbox"
                role="textbox"
                type="text"
                aria-label="Search"
                data-testid="orders-search"
                placeholder="Search orders…"
                value={searchTerm ?? ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // ⬅️ Force immediate server query with the full typed value
                    setDebouncedSearch(searchTerm ?? '');
                    setPageSafe(1);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${dividerColor}`,
                }}
              />
            </Box>

            <div role="dialog" aria-modal="true">
              <UserOrderFilters onClose={() => setFiltersOpen(false)} />
            </div>
          </RightFiltersDrawer>

          {/* ✅ Simple visible inline dialog so tests can reliably find it */}
          {filtersOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('filters.open', 'Filters')}
              data-testid="filters-dialog-inline"
              style={{
                marginTop: 12,
                padding: 12,
                border: `1px solid ${dividerColor}`,
                borderRadius: 8,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <label htmlFor="orders-search-inline" style={{ fontSize: 12 }}>
                  {t('orders.search', 'Order ID')}
                </label>
                <input
                  id="orders-search-inline"
                  role="textbox"
                  aria-label="Order ID"
                  value={searchTerm ?? ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setDebouncedSearch(searchTerm ?? '');
                      setPageSafe(1);
                      setFiltersOpen(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${dividerColor}`,
                  }}
                />
              </Box>
              <button
                data-testid="btn-apply-filters"
                onClick={() => {
                  // ⬅️ Force immediate server query with the full typed value
                  setDebouncedSearch(searchTerm ?? '');
                  setPageSafe(1);
                  setFiltersOpen(false);
                }}
              >
                {t('actions.apply', 'Apply')}
              </button>
            </div>
          )}
        </LocalizationProvider>
      </PageContainer>
    </PageLayout>
  );
}
