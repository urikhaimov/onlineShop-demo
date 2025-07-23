import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
import { useOrder, useUpdateOrder, Order } from '../../../hooks/useOrder';

import OrderSummaryCard from './components/OrderSummaryCard';
import OrderItemsTable from './components/OrderItemsTable';
import OrderStatusBadge from './components/OrderStatusBadge';
import LoadingProgress from '../../../components/LoadingProgress';

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, error } = useOrder(id);
  const updateOrderMutation = useUpdateOrder(id);
  const [toastOpen, setToastOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<Order>({
    defaultValues: order || {
      status: 'pending',
      notes: '',
      delivery: { provider: '', trackingNumber: '', eta: '' },
      items: [],
    },
  });

  useEffect(() => {
    if (order) reset(order);
  }, [order, reset]);

  const currentStatus = watch('status');

  const onSubmit: SubmitHandler<Order> = (formData) => {
    updateOrderMutation.mutate(
      { ...formData, previousStatus: order?.status },
      {
        onSuccess: () => setToastOpen(true),
      },
    );
  };

  if (isLoading) return <LoadingProgress />;

  if (isError)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          Error loading order: {error?.message}
        </Typography>
      </Box>
    );

  return (
    <Box
      sx={{
        position: 'relative',
        mt: `${headerHeight}px`,
        height: `calc(100vh - ${headerHeight + footerHeight}px)`,
        overflowY: 'auto',
        px: 2,
        py: 4,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Edit Order #{order?.id ?? ''}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack flex={2} spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Order Status</Typography>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Status"
                  margin="normal"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <OrderStatusBadge status={currentStatus} />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Delivery Information</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="delivery.provider"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Provider" fullWidth />
                )}
              />
              <Controller
                name="delivery.trackingNumber"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Tracking Number" fullWidth />
                )}
              />
            </Stack>
            <Box mt={2}>
              <Controller
                name="delivery.eta"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="ETA (ISO or text)" fullWidth />
                )}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Admin Notes</Typography>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Internal Notes"
                  fullWidth
                  multiline
                  rows={3}
                />
              )}
            />
          </Paper>

          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={updateOrderMutation.status === 'pending' || isSubmitting}
          >
            {updateOrderMutation.status === 'pending' ? (
              <CircularProgress size={24} />
            ) : (
              'Save Changes'
            )}
          </Button>
        </Stack>

        <Stack flex={1} spacing={2}>
          <OrderSummaryCard order={order!} />
          <OrderItemsTable items={order?.items ?? []} />
        </Stack>
      </Stack>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)}>
          Order updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}
