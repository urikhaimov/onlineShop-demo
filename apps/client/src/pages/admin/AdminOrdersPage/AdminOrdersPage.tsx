import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Divider,
  Typography,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';

import { Order, useOrders } from '../../../hooks/useOrders';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import StickyTable from '../../../components/StickyTable';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useAdminOrdersStore } from '../../../stores/useAdminOrdersStore';

// 🔗 URL sync for sorting + filters
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// columns
import { defineAdminOrderColumns } from './Columns';

// expanded row
import OrderExpandedRow from './OrderExpandedRow';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    snackbarOpen,
    setSnackbarOpen,
  } = useAdminOrdersStore();

  const { data = [], isLoading, error } = useOrders();

  // sync table state to the URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  const columns: ColumnDef<Order>[] = useMemo(
    () => defineAdminOrderColumns(navigate),
    [navigate],
  );

  const resetTableFilters = () => {
    setSorting([]);
    setColumnFilters([]);
    const next = new URLSearchParams(params);
    next.delete('sort');
    next.delete('filters');
    setParams(next, { replace: true });
  };

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Admin Orders</Typography>
          <Button size="small" variant="outlined" onClick={resetTableFilters}>
            Reset filters
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {isLoading ? (
          <LoadingProgress />
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            Failed to load orders: {error.message}
          </Typography>
        ) : data.length === 0 ? (
          <NotFound message="No orders found." />
        ) : (
          <StickyTable<Order>
            columns={columns}
            data={data}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            enableSorting
            enableColumnFilters
            rowsPerPage={10}
            // 👇 expanded row support
            enableRowExpansion
            renderExpandedRow={(row) => (
              // OrderExpandedRow expects TOrder; cast is safe if Order ≈ TOrder
              <OrderExpandedRow order={row as unknown as any} />
            )}
          />
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
      </Box>
    </PageLayout>
  );
}
