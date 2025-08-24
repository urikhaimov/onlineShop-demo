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
} from '@mui/material';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { headerHeight, footerHeight } from '../../../config/themeConfig';
import { useThemeStore } from '../../../stores/useThemeStore';

import { useOrder, useUpdateOrder, Order } from '../../../hooks/useOrder';
import LoadingProgress from '../../../components/LoadingProgress';
import FormTextField from '../../../components/FormTextField';
import OrderSummaryCard from './components/OrderSummaryCard';
import OrderItemsTable from './components/OrderItemsTable';
import OrderStatusBadge from './components/OrderStatusBadge';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

function getMaxWidthPx(maxWidth?: string) {
  const map: Record<string, number> = {
    xs: 444,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  return map[maxWidth || 'lg'] || 1200;
}

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
] as const;

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

  const { themeSettings } = useThemeStore();
  const radius = themeSettings.borderRadius ?? 8;
  const contentMax = Math.min(getMaxWidthPx(themeSettings.maxWidth), 1280);

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
      <Box
        sx={{
          // no top margin
          mb: `${footerHeight}px`,
          height: `calc(100vh - ${headerHeight + footerHeight}px)`,
          display: 'flex',
          justifyContent: 'center',
          overflowY: 'auto',
          px: 2,
          py: 3,
        }}
      >
        <Paper
          elevation={2}
          sx={{
            width: '100%',
            maxWidth: contentMax,
            borderRadius: radius,
          }}
        >
          <Stack>
            <Typography variant="h5" fontWeight={600}>
              {t('orderEdit.title', {
                defaultValue: 'Edit Order #{{id}}',
                id: order?.id ?? '',
              })}
            </Typography>

            {/* content */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {/* LEFT MAIN COLUMN */}
              <Stack flex={2} spacing={2}>
                <Paper sx={{ p: 2, borderRadius: radius }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {t('orderEdit.orderStatus', {
                      defaultValue: 'Order Status',
                    })}
                  </Typography>
                  <FormTextField
                    label={t('orderEdit.status', { defaultValue: 'Status' })}
                    name="status"
                    control={control}
                    errorObject={errors.status}
                    isSelect
                    selectOptions={STATUS_OPTIONS.map((value) => ({
                      label: t(`status.${value}`, { defaultValue: value }),
                      value,
                    }))}
                    required
                    fullWidth
                  />
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
                      t('orderEdit.saveChanges', {
                        defaultValue: 'Save Changes',
                      })
                    )}
                  </Button>
                </Box>
              </Stack>

              {/* RIGHT SIDEBAR */}
              <Stack flex={1} spacing={2}>
                {order && (
                  <Paper sx={{ p: 2, borderRadius: radius }}>
                    <OrderSummaryCard order={order} />
                  </Paper>
                )}
                <Divider />
                <Paper sx={{ p: 2, borderRadius: radius }}>
                  <OrderItemsTable items={order?.items ?? []} />
                </Paper>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Box>

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
