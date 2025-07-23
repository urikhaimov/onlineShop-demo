import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
} from '@mui/material';
import { ListChildComponentProps, VariableSizeList } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../../hooks/useOrders';
import PageWithStickyFilters from '../../../layouts/PageWithStickyFilters';
import LoadingProgress from '../../../components/LoadingProgress';
import AdminOrderFilters from './AdminOrderFilters';
import { filterReducer, initialFilterState } from './LocalReducer';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
import NotFound from '../../../components/NotFound';

type UIState = { mobileDrawerOpen: boolean };
type UIAction = { type: 'setMobileDrawerOpen'; payload: boolean };

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'setMobileDrawerOpen':
      return { ...state, mobileDrawerOpen: action.payload };
    default:
      return state;
  }
};

export default function AdminOrdersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(filterReducer, initialFilterState);
  const [uiState, uiDispatch] = useReducer(uiReducer, {
    mobileDrawerOpen: false,
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: allOrders = [], isLoading, error } = useOrders();

  useEffect(() => {
    const handler = () => setPage(1);
    window.addEventListener('admin-orders-reset-page', handler);
    return () => window.removeEventListener('admin-orders-reset-page', handler);
  }, []);

  const filteredOrders = useMemo(() => {
    return allOrders
      .filter((order) => {
        const matchesEmail =
          !state.email ||
          order.email?.toLowerCase().includes(state.email.toLowerCase());
        const matchesStatus =
          state.status === 'all' || order.status === state.status;
        const matchesMinTotal =
          !state.minTotal || order.total >= state.minTotal;
        const matchesMaxTotal =
          !state.maxTotal || order.total <= state.maxTotal;

        const createdAt =
          typeof order.createdAt === 'string'
            ? new Date(order.createdAt)
            : (order.createdAt?.toDate?.() ?? new Date());

        const matchesStartDate =
          !state.startDate || createdAt >= new Date(state.startDate);
        const matchesEndDate =
          !state.endDate || createdAt <= new Date(state.endDate);

        return (
          matchesEmail &&
          matchesStatus &&
          matchesMinTotal &&
          matchesMaxTotal &&
          matchesStartDate &&
          matchesEndDate
        );
      })
      .sort((a, b) => {
        const aDate =
          typeof a.createdAt === 'string'
            ? new Date(a.createdAt)
            : (a.createdAt?.toDate?.() ?? new Date());

        const bDate =
          typeof b.createdAt === 'string'
            ? new Date(b.createdAt)
            : (b.createdAt?.toDate?.() ?? new Date());

        return state.sortDirection === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      });
  }, [allOrders, state]);

  const visibleOrders = filteredOrders;

  const renderRow = ({ index, style }: ListChildComponentProps) => {
    const order = visibleOrders[index];
    if (!order) return null;

    const date =
      typeof order.createdAt === 'string'
        ? new Date(order.createdAt)
        : (order.createdAt?.toDate?.() ?? new Date());

    return (
      <Box
        key={order.id}
        sx={{
          ...style,
          px: 1,
          py: 1.5,
          boxSizing: 'border-box',
        }}
      >
        <Paper
          sx={{
            p: 2,
            borderRadius: 2,
            boxShadow: 2,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" noWrap>
            Order ID: {order.id}
          </Typography>
          <Typography variant="body2" noWrap>
            User ID: {order.userId}
          </Typography>
          <Typography variant="body2" noWrap>
            Email: {order.email}
          </Typography>
          <Typography variant="body2">
            Total: $
            {typeof order.total === 'number' ? order.total.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="body2">Date: {date.toLocaleString()}</Typography>
          <Typography variant="body2">Status: {order.status}</Typography>

          <Box mt={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/admin/orders/${order.id}`)}
            >
              Edit
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  const hasFilters =
    !!state.email ||
    state.status !== 'all' ||
    !!state.minTotal ||
    !!state.maxTotal ||
    !!state.startDate ||
    !!state.endDate;

  return (
    <PageWithStickyFilters
      title="Admin Orders"
      sidebar={<AdminOrderFilters state={state} dispatch={dispatch} />}
      onMobileOpen={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: true })
      }
      onMobileClose={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: false })
      }
      mobileOpen={uiState.mobileDrawerOpen}
      hasFilters={hasFilters}
      onReset={() => dispatch({ type: 'RESET_FILTERS' })}
    >
      <Divider sx={{ mb: 2 }} />

      {isLoading ? (
        <LoadingProgress />
      ) : error ? (
        <Typography color="error" sx={{ p: 2 }}>
          Failed to load orders: {error.message}
        </Typography>
      ) : visibleOrders.length === 0 ? (
        <NotFound message="No orders found." />
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <VariableSizeList
            height={window.innerHeight - headerHeight - footerHeight - 164}
            width="100%"
            itemCount={visibleOrders.length}
            itemSize={() => (isMobile ? 280 : 220)}
            style={{ overflowX: 'hidden' }}
          >
            {renderRow}
          </VariableSizeList>
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Action completed successfully
        </Alert>
      </Snackbar>
    </PageWithStickyFilters>
  );
}
