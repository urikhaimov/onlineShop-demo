// src/pages/MyOrdersPage.tsx
import * as React from 'react';
import { Box, Divider, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import StickyTable from '../../components/StickyTable';
import { useAuth } from '../../hooks/useAuth';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { fetchMyOrders } from '../../api/orderApi';
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

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  // 🧩 Theme store → theme-aware tokens
  const { themeSettings } = useThemeStore();
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const brand = themeSettings?.primaryColor || theme.palette.primary.main;

  // Derived design values (keep sx scalar-friendly)
  const unit = Math.max(1, Math.round(2 * spacingScale));
  const gapY = Math.max(2, unit); // vertical rhythm
  const stickyShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const dividerColor =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12);
  const stickyBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 0.9)`
    : alpha(theme.palette.background.paper, 0.92);
  const stickyBorder =
    theme.vars?.palette?.divider ?? alpha(brand, isDark ? 0.25 : 0.18);

  // ✅ Build columns via hook (reacts to locale changes)
  const columns = useOrderColumns();

  // Table state (Zustand)
  const {
    orders,
    loading,
    sorting,
    columnFilters,
    viewMode,
    setOrders,
    setLoading,
    setSorting,
    setColumnFilters,
    setViewMode,
  } = useOrdersPageStore();

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

  // Fetch orders
  React.useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        const fetchFn = () =>
          fetchMyOrders().then((res) => res.data as TOrder[]);
        const list = await retryWithBackoff(fetchFn);
        setOrders(list);
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [user, setOrders, setLoading]);

  // Apply page-level filters
  const filteredOrders = React.useMemo(() => {
    const q = (searchTerm ?? '').toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = order.id.toLowerCase().includes(q);
      const matchesStatus = !status || order.status === status;

      const createdDate = getOrderCreatedDate(order);
      const createdStr = createdDate
        ? createdDate.toISOString().split('T')[0]
        : '';

      const matchesDateFrom = !dateFrom || createdStr >= dateFrom;
      const matchesDateTo = !dateTo || createdStr <= dateTo;

      const total = order.totalAmount;
      const minT = Number.isFinite(minTotal) ? minTotal : ORDER_TOTAL_MIN;
      const maxT = Number.isFinite(maxTotal) ? maxTotal : ORDER_TOTAL_MAX;
      const matchesTotal = total >= minT && total <= maxT;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesTotal
      );
    });
  }, [orders, searchTerm, status, dateFrom, dateTo, minTotal, maxTotal]);

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

  React.useEffect(() => {
    return () => {
      resetFilters();
    };
  }, [resetFilters]);

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
  };

  if (!user || loading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.ORDERS}
    >
      <PageContainer>
        {/* Sticky header controls (theme-aware) */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            bgcolor: stickyBg,
            backdropFilter: 'saturate(140%) blur(8px)',
            borderBottom: `1px solid ${stickyBorder}`,
            py: gapY * 0.5,
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
            // Give buttons a consistent width scaled by spacing
            buttonWidth={isSmDown ? 'auto' : 120 + 8 * (unit - 2)}
          />
        </Box>

        <Divider sx={{ mb: 2, borderColor: dividerColor }} />

        {filteredOrders.length === 0 ? (
          <NotFound message={t('empty.noOrders')} />
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
            enablePagination
            enableSorting
            enableRowExpansion
            renderExpandedRow={(order) => <OrderExpandedRow order={order} />}
            bodyMaxHeight="60vh"
          />
        )}

        <RightFiltersDrawer
          title={t('filters.open')}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <UserOrderFilters onClose={() => setFiltersOpen(false)} />
        </RightFiltersDrawer>
      </PageContainer>
    </PageLayout>
  );
}
