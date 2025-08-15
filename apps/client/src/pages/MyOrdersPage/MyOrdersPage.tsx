import React, { useEffect, useMemo } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
  Drawer,
  Typography,
  IconButton,
  Button,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';

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
import { useOrderFilterStore } from '../../stores/useOrderFilterStore';
import { useOrdersPageStore } from '../../stores/useOrdersPageStore';
import OrderExpandedRow from './OrderExpandedRow';

// single composed hook that syncs table + orders filters to the URL
import { useOrdersTableQuerySync } from '../../hooks/useOrdersTableQuerySync';

export default function MyOrdersPage() {
  const { user } = useAuth();

  // Page UI + table state (Zustand)
  const {
    orders,
    loading,
    sorting,
    columnFilters,
    viewMode,
    mobileFiltersOpen,
    setOrders,
    setLoading,
    setSorting,
    setColumnFilters,
    setViewMode,
    setMobileFiltersOpen,
  } = useOrdersPageStore();

  // Page-level filters (Zustand)
  const {
    searchTerm,
    status,
    dateFrom,
    dateTo,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
  } = useOrderFilterStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch my orders
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
    const q = searchTerm.toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = order.id.toLowerCase().includes(q);
      const matchesStatus = !status || order.status === status;

      const createdDate = getOrderCreatedDate(order);
      const createdStr = createdDate
        ? createdDate.toISOString().split('T')[0]
        : '';

      const matchesDateFrom = !dateFrom || createdStr >= dateFrom;
      const matchesDateTo = !dateTo || createdStr <= dateTo;

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [orders, searchTerm, status, dateFrom, dateTo]);

  // ---- URL Sync (table + orders filters) ----
  useOrdersTableQuerySync({
    // table
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    viewMode,
    setViewMode,
    // orders filters
    searchTerm,
    status,
    dateFrom,
    dateTo,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
  });

  // ---- Reset all filters (table + page) ----
  const resetAllFilters = () => {
    // page-level
    setSearchTerm('');
    setStatus(null);
    setDateFrom(null);
    setDateTo(null);
    // table-level
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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          {/* Left side: mobile filters launcher (only in cards view) */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {viewMode === 'cards' && isMobile && (
              <IconButton onClick={() => setMobileFiltersOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next) => {
                if (next) setViewMode(next);
              }}
              size="small"
            >
              <ToggleButton value="table">Table View</ToggleButton>
              <ToggleButton value="cards">Card View</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Right side: show Reset button in table view too */}
          {viewMode === 'table' && (
            <Button size="small" variant="outlined" onClick={resetAllFilters}>
              Reset filters
            </Button>
          )}
        </Box>

        {viewMode === 'cards' && !isMobile && (
          <Box mb={2}>
            <UserOrderFilters />
          </Box>
        )}

        {filteredOrders.length === 0 ? (
          <NotFound message="No orders found." />
        ) : viewMode === 'cards' ? (
          <Box
            display="grid"
            gap={2}
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
          >
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </Box>
        ) : (
          <StickyTable<TOrder>
            columns={defineOrderColumns()}
            data={filteredOrders}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            stickyColumnIndex={0}
            enablePagination
            enableSorting
            enableColumnFilters
            enableRowExpansion
            renderExpandedRow={(order) => <OrderExpandedRow order={order} />}
          />
        )}

        <Drawer
          anchor="left"
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        >
          <Box width={280} p={2}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={() => setMobileFiltersOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <UserOrderFilters />
          </Box>
        </Drawer>
      </Box>
    </PageLayout>
  );
}
