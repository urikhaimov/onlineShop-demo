import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import {
  VariableSizeList as List,
  ListChildComponentProps,
} from 'react-window';
import PageWithStickyFilters from '../../layouts/PageWithStickyFilters';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { filterReducer, initialFilterState, Order } from './LocalReducer';
import UserOrderFilters from './UserOrderFilters';
import { fetchMyOrders } from '../../api/orderApi';
import LoadingProgress from '../../components/LoadingProgress';
import { Timestamp } from 'firebase/firestore';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import { useAuth } from '../../hooks/useAuth';
import OrderCard from './OrderCard';
import NotFound from '../../components/NotFound';
export default function MyOrdersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [index: number]: number }>({});

  const rowGap = 12;
  const { user } = useAuth();

  const setSize = (index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current = { ...sizeMap.current, [index]: size };
      listRef.current?.resetAfterIndex(index);
    }
  };

  const getItemSize = (index: number) => {
    return (sizeMap.current[index] ?? (isMobile ? 400 : 320)) + rowGap;
  };

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
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

  const hasFilters = useMemo(
    () =>
      filterState.status !== 'all' ||
      !!filterState.startDate ||
      !!filterState.endDate ||
      filterState.minTotal !== null ||
      filterState.maxTotal !== null ||
      !!filterState.email,
    [filterState],
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

  if (!user || loading) return <LoadingProgress />;

  const Row = ({ index, style }: ListChildComponentProps) => {
    const order = filteredOrders[index];
    return (
      <Box style={{ ...style, paddingBottom: rowGap }} key={order.id}>
        <Box
          ref={(el) => {
            if (el instanceof HTMLElement) {
              setSize(index, el.getBoundingClientRect().height);
            }
          }}
        >
          <OrderCard order={order} />
        </Box>
      </Box>
    );
  };

  return (
    <PageWithStickyFilters
      title="My Orders"
      sidebar={<UserOrderFilters state={filterState} dispatch={dispatch} />}
      mobileOpen={mobileOpen}
      onMobileOpen={() => setMobileOpen(true)}
      onMobileClose={() => setMobileOpen(false)}
      hasFilters={hasFilters}
      onReset={() => dispatch({ type: 'RESET_FILTERS' })}
    >
      {filteredOrders.length === 0 ? (
        <NotFound message="No orders found." />
      ) : (
        <List
          ref={listRef}
          height={window.innerHeight - (headerHeight + footerHeight + 140)}
          itemCount={filteredOrders.length}
          itemSize={getItemSize}
          width="100%"
          overscanCount={3}
        >
          {Row}
        </List>
      )}
    </PageWithStickyFilters>
  );
}
