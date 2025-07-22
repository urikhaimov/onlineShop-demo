import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Box, Chip, Divider, Link, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageWithStickyFilters from '../../layouts/PageWithStickyFilters';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { filterReducer, initialFilterState, Order } from './LocalReducer';
import UserOrderFilters from './UserOrderFilters';
import { fetchMyOrders } from '../../api/orderApi';
import LoadingProgress from '../../components/LoadingProgress';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency } from '../../utils/format';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import { useAuth } from '../../hooks/useAuth';

function getStatusColor(status: string) {
  switch (status) {
    case 'processing':
      return 'warning';
    case 'shipped':
      return 'info';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export default function MyOrdersPage() {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const fetchFn = () => fetchMyOrders().then((res) => res.data);
        const list = await retryWithBackoff(fetchFn);

        const converted = list.map((order: any) => ({
          ...order,
          email: order.email ?? '',
          createdAt: order.createdAt?.seconds
            ? new Timestamp(
                order.createdAt.seconds,
                order.createdAt.nanoseconds,
              )
            : Timestamp.fromDate(new Date(order.createdAt)),
        }));

        setOrders(converted);
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [user]);

  const hasFilters = Boolean(
    filterState.status !== 'all' ||
      filterState.startDate ||
      filterState.endDate ||
      filterState.minTotal !== null ||
      filterState.maxTotal !== null ||
      filterState.email,
  );

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const created = order.createdAt.toDate();
        const matchStatus =
          filterState.status === 'all' || order.status === filterState.status;
        const matchStart =
          !filterState.startDate || created >= filterState.startDate;
        const matchEnd = !filterState.endDate || created <= filterState.endDate;
        const matchMin =
          filterState.minTotal === null || order.amount >= filterState.minTotal;
        const matchMax =
          filterState.maxTotal === null || order.amount <= filterState.maxTotal;
        const matchEmail =
          !filterState.email ||
          (order.email?.includes?.(filterState.email) ?? false);
        return (
          matchStatus &&
          matchStart &&
          matchEnd &&
          matchMin &&
          matchMax &&
          matchEmail
        );
      })
      .sort((a, b) => {
        const aTime = a.createdAt.toMillis();
        const bTime = b.createdAt.toMillis();
        return filterState.sortDirection === 'asc'
          ? aTime - bTime
          : bTime - aTime;
      });
  }, [orders, filterState]);

  if (!user || loading) {
    return <LoadingProgress />;
  }

  const Row = ({ index, style }: ListChildComponentProps) => {
    const order = filteredOrders[index];

    return (
      <Box mb={2} key={order.id} style={style}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            <Link
              component={RouterLink}
              to={`/order/${order.id}`}
              underline="hover"
              sx={{ cursor: 'pointer' }}
            >
              Order #{order.id}
            </Link>
          </Typography>
          <Chip
            label={order.status}
            color={getStatusColor(order.status)}
            size="small"
            sx={{ my: 1 }}
          />
          <Typography variant="body2">
            Date: {order.createdAt.toDate().toLocaleString()}
          </Typography>
          <Typography variant="body2">
            Paid with: Visa ending in 4242
          </Typography>
          <Typography variant="body2">Shipping: Express Delivery</Typography>
          <Typography variant="body2">Delivery ETA: July 8, 2025</Typography>
          <Typography variant="body2" gutterBottom>
            Total: {formatCurrency(order.amount)}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <ul style={{ margin: 0, padding: 0 }}>
            {order.items.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity} — Price:{' '}
                {formatCurrency(item.price)}
              </li>
            ))}
          </ul>
        </Paper>
      </Box>
    );
  };

  return (
    <PageWithStickyFilters
      title="My Orders"
      sidebar={<UserOrderFilters state={filterState} dispatch={dispatch} />}
      mobileOpen={mobileOpen}
      onMobileOpen={() => setMobileOpen(true)} // 👈 Required
      onMobileClose={() => setMobileOpen(false)} // 👈 Required
      hasFilters={hasFilters} // 👈 Required
      onReset={() => dispatch({ type: 'RESET_FILTERS' })} // 👈 Required
    >
      {filteredOrders.length === 0 ? (
        <Typography>No orders found.</Typography>
      ) : (
        <List
          height={window.innerHeight - (headerHeight + footerHeight + 140)}
          itemCount={filteredOrders.length}
          itemSize={280}
          width="100%"
        >
          {Row}
        </List>
      )}
    </PageWithStickyFilters>
  );
}
