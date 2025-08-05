import React, { useEffect, useReducer, useState } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
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
import { Order } from '../../types/order';
import OrderCard from './OrderCard';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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

  if (!user || loading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.ORDERS}
    >
      <Box px={{ xs: 1, sm: 2 }} py={3}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
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

        {orders.length === 0 ? (
          <NotFound message="No orders found." />
        ) : viewMode === 'cards' ? (
          <Box
            display="grid"
            gap={2}
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
          >
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </Box>
        ) : (
          <StickyTable
            columns={defineOrderColumns()}
            data={orders}
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
      </Box>
    </PageLayout>
  );
}
