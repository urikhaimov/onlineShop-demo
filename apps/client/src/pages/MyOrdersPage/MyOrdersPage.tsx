// src/pages/MyOrdersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Divider } from '@mui/material';

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

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // ✅ Build columns via hook (stable hook order, reacts to locale changes)
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

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch orders
  useEffect(() => {
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
  const filteredOrders = useMemo(() => {
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

      const total = typeof order.amount === 'number' ? order.amount : 0;
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

  useEffect(() => {
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
