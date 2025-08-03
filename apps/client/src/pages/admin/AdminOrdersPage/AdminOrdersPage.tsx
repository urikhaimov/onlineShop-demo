import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Order } from '../../../hooks/useOrders';
import { useOrders } from '../../../hooks/useOrders';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import StickyTable from '../../../components/StickyTable';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

export default function AdminOrdersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const { data = [], isLoading, error } = useOrders();

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'userId',
      header: 'User ID',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (info) => info.getValue() ?? 'N/A',
      enableColumnFilter: true,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: (info) =>
        typeof info.getValue() === 'number'
          ? `$${(info.getValue() as number).toFixed(2)}`
          : 'N/A',
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        const raw = row.original.createdAt;
        const date =
          typeof raw === 'string'
            ? new Date(raw)
            : (raw?.toDate?.() ?? new Date());
        return date.toLocaleString();
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => info.getValue(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/admin/orders/${row.original.id}`)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <Typography variant="h6" gutterBottom>
          Admin Orders
        </Typography>

        <Divider sx={{ mb: 2 }} />

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
