import React, { useEffect, useReducer, useState, useMemo } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
  Drawer,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';

import { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import StickyTable from '../../components/StickyTable';
import { useAuth } from '../../hooks/useAuth';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { fetchMyOrders } from '../../api/orderApi';
import { filterReducer, initialFilterState } from './LocalReducer';
import { defineOrderColumns } from './Columns';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { TOrder as Order } from '@common/types';
import OrderCard from './OrderCard';
import UserOrderFilters from './UserOrderFilters';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        const fetchFn = () => fetchMyOrders().then((res) => res.data);
        const list = await retryWithBackoff(fetchFn);
        setOrders(list);
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [user]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.id
        .toLowerCase()
        .includes(filterState.searchTerm.toLowerCase());
      const matchesStatus =
        !filterState.status || order.status === filterState.status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, filterState]);

  if (!user || loading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.ORDERS}
    >
      <Box px={{ xs: 1, sm: 2 }} py={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          {viewMode === 'cards' && isMobile && (
            <IconButton onClick={() => setMobileFiltersOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => {
              if (next) setViewMode(next);
            }}
            size="small"
          >
            <ToggleButton value="table">Table View</ToggleButton>
            <ToggleButton value="cards">Card View</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {viewMode === 'cards' && !isMobile && (
          <Box mb={2}>
            <UserOrderFilters state={filterState} dispatch={dispatch} />
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
          <StickyTable
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
          />
        )}

        {/* Mobile Filters Drawer */}
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
            <UserOrderFilters state={filterState} dispatch={dispatch} />
          </Box>
        </Drawer>
      </Box>
    </PageLayout>
  );
}
