// src/pages/admin/orders/EditOrderPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
} from '@mui/material';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { useOrder, useUpdateOrder, Order } from '../../../hooks/useOrder';
import LoadingProgress from '@client/components/LoadingProgress';
import FormTextField from '@client/components/FormTextField';

import OrderStatusBadge from './components/OrderStatusBadge';
import OrderItems from '../../../components/orders/OrderItems';
import OrderCustomer from '../../../components/orders/OrderCustomer';
import OrderShipping from '../../../components/orders/OrderShipping';
import OrderPayment from '../../../components/orders/OrderPayment';
import OrderTimestamps from '../../../components/orders/OrderTimestamps';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { ESTATUS_OPTIONS } from '@common/types';
// ✅ Reusable page card layout
import PageCard from '@client/layouts/PageCard';

// For inner paper radius
import { useThemeStore } from '../../../stores/useThemeStore';
import { getLayoutTokens } from '../../../utils/uiLayout';

export default function EditOrderPage() {
  const { t } = useTranslation();
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
      { onSuccess: () => setToastOpen(true) },
    );
  };

  // keep inner card radius consistent with theme settings
  const { themeSettings } = useThemeStore();
  const { radius } = getLayoutTokens(themeSettings, 'form');

  if (isLoading) return <LoadingProgress />;
  if (isError)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          {t('orderEdit.errorLoading', {
            defaultValue: 'Error loading order: {{message}}',
            message: error?.message,
          })}
        </Typography>
      </Box>
    );

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      {/* ✅ Reusable PageCard handles outer scroll area, centered paper, and inner padding */}
      <PageCard variant="form" pad={{ xs: 3, sm: 3.5, md: 4 }}>
        <Stack>
          <Typography variant="h5" fontWeight={600}>
            {t('orderEdit.title', {
              defaultValue: 'Edit Order #{{id}}',
              id: order?.id ?? '',
            })}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* LEFT MAIN COLUMN */}
            <Stack flex={2} spacing={2}>
              <Paper sx={{ p: 2, borderRadius: radius }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {t('orderEdit.orderStatus', { defaultValue: 'Order Status' })}
                </Typography>
                <FormTextField
                  label={t('orderEdit.status', { defaultValue: 'Status' })}
                  name="status"
                  control={control}
                  errorObject={errors.status}
                  select
                  required
                  fullWidth
                >
                  {Object.values(ESTATUS_OPTIONS).map((value) => (
                    <MenuItem key={value} value={value}>
                      {t(`status.${value}`, { defaultValue: value })}
                    </MenuItem>
                  ))}
                </FormTextField>
                <Box mt={2}>
                  <OrderStatusBadge status={currentStatus} />
                </Box>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: radius }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {t('orderEdit.deliveryInfo', {
                    defaultValue: 'Delivery Information',
                  })}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormTextField
                    label={t('orderEdit.provider', {
                      defaultValue: 'Provider',
                    })}
                    name="delivery.provider"
                    control={control}
                    errorObject={errors?.delivery?.provider}
                    fullWidth
                  />
                  <FormTextField
                    label={t('orderEdit.trackingNumber', {
                      defaultValue: 'Tracking Number',
                    })}
                    name="delivery.trackingNumber"
                    control={control}
                    errorObject={errors?.delivery?.trackingNumber}
                    fullWidth
                  />
                </Stack>
                <Box mt={2}>
                  <FormTextField
                    label={t('orderEdit.eta', {
                      defaultValue: 'ETA (ISO or text)',
                    })}
                    name="delivery.eta"
                    control={control}
                    errorObject={errors?.delivery?.eta}
                    fullWidth
                  />
                </Box>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: radius }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {t('orderEdit.adminNotes', { defaultValue: 'Admin Notes' })}
                </Typography>
                <FormTextField
                  label={t('orderEdit.internalNotes', {
                    defaultValue: 'Internal Notes',
                  })}
                  name="notes"
                  control={control}
                  errorObject={errors.notes}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Paper>

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
                    t('orderEdit.saveChanges', { defaultValue: 'Save Changes' })
                  )}
                </Button>
              </Box>
            </Stack>

            {/* RIGHT SIDEBAR */}
            <Stack flex={1} spacing={2}>
              <OrderCustomer order={order} />
              <OrderShipping order={order} />
              <OrderItems order={order} />
              <OrderPayment order={order} />
              <OrderTimestamps order={order} />
            </Stack>
          </Stack>
        </Stack>
      </PageCard>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)}>
          {t('orderEdit.success', {
            defaultValue: 'Order updated successfully!',
          })}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
