// src/pages/MyOrdersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Drawer,
  Typography,
  IconButton,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import CloseIcon from '@mui/icons-material/Close';

import StickyTable from '../../components/StickyTable';
import { useAuth } from '../../hooks/useAuth';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { fetchMyOrders } from '../../api/orderApi';
import { defineOrderColumns } from './Columns';
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

type ViewMode = 'table' | 'cards';

export default function MyOrdersPage() {
  const { user } = useAuth();

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

  // Page-level filters (Zustand)
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
  } = useOrderFilterStore();

  // Drawer open (local UI state)
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

  // Apply page-level filters (search/status/date/total)
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

  // URL sync:
  // - Sorting & columnFilters via generic table hook
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });
  // - Page filters + view mode (parity with Products page)
  useOrderFiltersQuerySync(viewMode as ViewMode, (v) =>
    setViewMode(v as ViewMode),
  );

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((prev) =>
      typeof updater === 'function' ? (updater as any)(prev) : updater,
    );
  };

  // Reset page + table filters
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
      <Box px={5} py={4}>
        {/* Sticky header controls (parity with Products page) */}
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

        {filteredOrders.length === 0 ? (
          <NotFound message="No orders found." />
        ) : viewMode === 'cards' ? (
          // Cards — Box CSS grid
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
            {filteredOrders.map((order) => (
              <Box key={order.id} display="flex">
                <OrderCard order={order} />
              </Box>
            ))}
          </Box>
        ) : (
          // Table — no column filters (filters live in drawer)
          <StickyTable<TOrder>
            columns={defineOrderColumns()}
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

        {/* Filters Drawer (right) */}
        <Drawer
          anchor="right"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 360 } } }}
        >
          <Box p={2}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
            >
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={() => setFiltersOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <UserOrderFilters />

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
      </Box>
    </PageLayout>
  );
}
