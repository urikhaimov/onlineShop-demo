// src/pages/admin/orders/EditOrderPage.tsx
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { useOrder, useUpdateOrder, type Order } from '../../../hooks/useOrder';
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
import PageCard from '@client/layouts/PageCard';

import { useThemeStore } from '../../../stores/useThemeStore';
import { getLayoutTokens } from '../../../utils/uiLayout';
import { useSnackbar } from 'notistack';

type UpdateOrderVars = Order & {
  previousStatus?: Order['status'];
};

type UpdateOrderMutation = {
  mutate: (
    vars: UpdateOrderVars,
    opts?: { onSuccess?: () => void; onError?: (e: unknown) => void },
  ) => void;
  mutateAsync?: (vars: UpdateOrderVars) => Promise<void>;
  status: 'idle' | 'pending' | 'error' | 'success' | (string & {});
};

export default function EditOrderPage() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, isError, error } = useOrder(id);
  const updateOrderMutation = useUpdateOrder(id) as UpdateOrderMutation;

  // Keep most recent order in a ref (for previousStatus, etc.)
  const orderRef = useRef<Order | undefined>(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // RHF v8: <TFieldValues, TContext, TTransformedValues>
  // Explicitly set TTransformedValues = Order to align handleSubmit with SubmitHandler<Order>
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<Order, any, Order>({
    mode: 'onChange',
    defaultValues: order ?? {
      id: id ?? '',
      status: 'pending',
      notes: '',
      delivery: { provider: '', trackingNumber: '', eta: '' },
      items: [],
      // DeepPartial<Order> allows omitting the rest; no `any` needed.
    },
  });

  // keep form in sync after order loads
  useEffect(() => {
    if (order) reset(order);
  }, [order, reset]);

  const currentStatus = watch('status');

  // submit guards + programmatic form submit (prevents double fire)
  const formRef = useRef<HTMLFormElement | null>(null);
  const submittingRef = useRef(false);

  const onSubmit: SubmitHandler<Order> = async (formData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const previousStatus = orderRef.current?.status;

      const run =
        updateOrderMutation.mutateAsync ??
        ((vars: UpdateOrderVars) =>
          new Promise<void>((resolve, reject) =>
            updateOrderMutation.mutate(vars, {
              onSuccess: () => resolve(),
              onError: (e: unknown) => reject(e),
            }),
          ));

      await run({ ...formData, previousStatus });

      enqueueSnackbar(
        t('orderEdit.success', {
          defaultValue: 'Order updated successfully!',
        }),
        { variant: 'success', autoHideDuration: 4000 },
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('orderEdit.updateFailed', {
              defaultValue: 'Failed to update order.',
            });

      enqueueSnackbar(message, {
        variant: 'error',
        autoHideDuration: 4000,
      });

      // allow retry on error
      submittingRef.current = false;
      return;
    } finally {
      // do not flip submittingRef back on success to avoid accidental re-submits
    }
  };

  const submitHandler = handleSubmit(onSubmit);

  const handleClickSave = () => {
    if (formRef.current?.requestSubmit) formRef.current.requestSubmit();
    else formRef.current?.submit();
  };

  const { themeSettings } = useThemeStore();
  const { radius } = getLayoutTokens(themeSettings, 'form');

  if (isLoading) return <LoadingProgress />;
  if (isError)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          {t('orderEdit.errorLoading', {
            defaultValue: 'Error loading order: {{message}}',
            message: (error as { message?: string } | undefined)?.message,
          })}
        </Typography>
      </Box>
    );

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <PageCard variant="form" pad={{ xs: 3, sm: 3.5, md: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" fontWeight={600}>
            {t('orderEdit.title', {
              defaultValue: 'Edit Order #{{id}}',
              id: order?.id ?? '',
            })}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            {/* LEFT MAIN COLUMN */}
            <Stack flex={2} spacing={2.5}>
              <Paper sx={{ p: 2, borderRadius: radius }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {t('orderEdit.orderStatus', { defaultValue: 'Order Status' })}
                </Typography>

                <FormTextField<Order>
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
                  <FormTextField<Order>
                    label={t('orderEdit.provider', {
                      defaultValue: 'Provider',
                    })}
                    name="delivery.provider"
                    control={control}
                    errorObject={errors?.delivery?.provider}
                    fullWidth
                  />
                  <FormTextField<Order>
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
                  <FormTextField<Order>
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

                <FormTextField<Order>
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
                  type="button"
                  onClick={handleClickSave}
                  disabled={
                    isSubmitting ||
                    submittingRef.current ||
                    updateOrderMutation.status === 'pending'
                  }
                >
                  {updateOrderMutation.status === 'pending' ||
                  submittingRef.current ? (
                    <CircularProgress size={24} />
                  ) : (
                    t('orderEdit.saveChanges', { defaultValue: 'Save Changes' })
                  )}
                </Button>
              </Box>
            </Stack>

            {/* RIGHT SIDEBAR */}
            <Stack flex={1} spacing={2.5}>
              <OrderCustomer order={order} />
              <OrderShipping order={order} />
              <OrderItems order={order} />
              <OrderPayment order={order} />
              <OrderTimestamps order={order} />
            </Stack>
          </Stack>

          {/* Hidden form element to centralize submission & validations */}
          <Box
            component="form"
            ref={formRef}
            onSubmit={(e) => {
              // Let RHF handle preventDefault; we only stop propagation.
              e.stopPropagation();
              void submitHandler(e);
            }}
            sx={{ display: 'contents' }}
            noValidate
          />
        </Stack>
      </PageCard>
    </PageLayout>
  );
}
