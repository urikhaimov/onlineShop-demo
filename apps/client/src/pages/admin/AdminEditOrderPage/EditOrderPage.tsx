import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Divider,
} from '@mui/material';

import { useParams } from 'react-router-dom';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
import { useOrder, useUpdateOrder, Order } from '../../../hooks/useOrder';

import OrderSummaryCard from './components/OrderSummaryCard';
import OrderItemsTable from './components/OrderItemsTable';
import OrderStatusBadge from './components/OrderStatusBadge';
import LoadingProgress from '../../../components/LoadingProgress';
import FormTextField from '../../../components/FormTextField';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
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
    formState: { isSubmitting, errors },
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
        {/* LEFT MAIN COLUMN */}
        <Stack flex={2} spacing={3}>
          {/* Status */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Order Status
            </Typography>
            <FormTextField
              label="Status"
              name="status"
              control={control}
              errorObject={errors.status}
              isSelect
              selectOptions={STATUS_OPTIONS.map((value) => ({
                label: value.toUpperCase(),
                value,
              }))}
              required
              fullWidth
            />
            <Box mt={2}>
              <OrderStatusBadge status={currentStatus} />
            </Box>
          </Paper>

          {/* Delivery */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Delivery Information
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField
                label="Provider"
                name="delivery.provider"
                control={control}
                errorObject={errors?.delivery?.provider}
                fullWidth
              />
              <FormTextField
                label="Tracking Number"
                name="delivery.trackingNumber"
                control={control}
                errorObject={errors?.delivery?.trackingNumber}
                fullWidth
              />
            </Stack>
            <Box mt={2}>
              <FormTextField
                label="ETA (ISO or text)"
                name="delivery.eta"
                control={control}
                errorObject={errors?.delivery?.eta}
                fullWidth
              />
            </Box>
          </Paper>

          {/* Notes */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Admin Notes
            </Typography>
            <FormTextField
              label="Internal Notes"
              name="notes"
              control={control}
              errorObject={errors.notes}
              multiline
              rows={3}
              fullWidth
            />
          </Paper>

          {/* Save Button */}
          <Box textAlign="right">
            <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={
                updateOrderMutation.status === 'pending' || isSubmitting
              }
            >
              {updateOrderMutation.status === 'pending' ? (
                <CircularProgress size={24} />
              ) : (
                'Save Changes'
              )}
            </Button>
          </Box>
        </Stack>

        {/* RIGHT SIDEBAR */}
        <Stack flex={1} spacing={2}>
          {order && <OrderSummaryCard order={order} />} {/* ✅ Fixed warning */}
          <Divider />
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
