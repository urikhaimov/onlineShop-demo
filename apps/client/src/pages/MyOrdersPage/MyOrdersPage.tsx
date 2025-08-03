import React, { useEffect, useReducer } from 'react';
import { Box } from '@mui/material';
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
export default function MyOrdersPage() {
  const { user } = useAuth();
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

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
        {orders.length === 0 ? (
          <NotFound message="No orders found." />
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
