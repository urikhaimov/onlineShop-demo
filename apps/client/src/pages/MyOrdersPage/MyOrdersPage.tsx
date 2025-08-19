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
  Container, // ⬅️ add
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
      {/* One container controls equal left/right padding on every breakpoint */}
      <Container
        maxWidth="xl"
        disableGutters
        sx={{
          px: { xs: 2, sm: 3, md: 4 }, // symmetric gutters
          py: 4,
          mx: 'auto',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'clip',
        }}
      >
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
            sx={{ minWidth: 0 }}
          >
            <Stack
              direction="row"
              gap={1}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
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
          // Cards Grid
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
            {filteredOrders.map((order) => (
              <Box key={order.id} sx={{ display: 'flex', minWidth: 0 }}>
                <OrderCard order={order} />
              </Box>
            ))}
          </Box>
        ) : (
          // Table
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

        {/* Filters Drawer */}
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

            <UserOrderFilters onClose={() => setFiltersOpen(false)} />
          </Box>
        </Drawer>
      </Container>
    </PageLayout>
  );
}
