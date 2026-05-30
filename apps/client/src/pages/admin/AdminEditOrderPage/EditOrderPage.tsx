// src/pages/admin/orders/EditOrderPage.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import PageCard from '@client/layouts/PageCard';

import { useThemeStore } from '../../../stores/useThemeStore';
import { getLayoutTokens } from '../../../utils/uiLayout';
import { useSnackbar } from 'notistack';

// Canonical statuses from shared types
import {
  ORDER_STATUS,
  type TOrderStatus,
  type TPaymentStatus,
} from '@common/types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers / Normalizers (match Orders list expanded row)
// ──────────────────────────────────────────────────────────────────────────────
const ZERO_DEC = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function toMajorFromMinor(minor?: number, currency?: string) {
  if (minor === null) return undefined;
  const cur = (currency || '').toUpperCase();
  return ZERO_DEC.has(cur) ? Math.round(minor) : minor / 100;
}

function statusToCanon(s?: string): TOrderStatus {
  const raw = String(s ?? '').toLowerCase();
  if (
    [
      'open',
      'authorized',
      'paid',
      'shipped',
      'delivered',
      'refunded',
      'canceled',
    ].includes(raw)
  ) {
    return raw as TOrderStatus;
  }
  if (raw === 'pending') return 'open';
  if (raw === 'confirmed') return 'paid';
  if (raw === 'cancelled') return 'canceled';
  if (raw === 'succeeded') return 'paid';
  if (
    [
      'processing',
      'requires_confirmation',
      'requires_action',
      'requires_capture',
      'requires_payment_method',
    ].includes(raw)
  )
    return 'open';
  return 'open';
}

function deriveProviderStatus(canon: TOrderStatus): TPaymentStatus {
  if (canon === 'paid') return 'succeeded';
  if (canon === 'canceled') return 'canceled';
  return 'processing';
}

function flattenShipping(order: Order) {
  const s: any = (order as any).shippingAddress || {};
  const addr = s.address || s || {};
  return s || addr
    ? {
        fullName: s.name ?? (order as any).ownerName ?? undefined,
        phone: s.phone ?? undefined,
        street: addr.line1 ?? addr.line ?? addr.street ?? undefined,
        city: addr.city ?? undefined,
        postalCode: addr.postalCode ?? addr.postal_code ?? undefined,
        country: (addr.country || '').toUpperCase() || undefined,
      }
    : undefined;
}

function normalizeForView(order: Order): Order {
  const currency =
    (order as any).currency ||
    ((order as any).payment?.currency as string | undefined);

  const totalFromMinor =
    toMajorFromMinor(
      (order as any).totalAmount ?? (order as any).totalMinor,
      currency,
    ) ?? undefined;

  const totalFromTotalMajor: number | undefined = (order as any).totalMajor;

  const total =
    typeof (order as any).total === 'number'
      ? (order as any).total
      : typeof totalFromTotalMajor === 'number'
        ? totalFromTotalMajor
        : totalFromMinor;

  const canon = statusToCanon((order as any).status);

  const payment =
    (order as any).payment && (order as any).payment.method
      ? (order as any).payment
      : {
          method: 'card',
          status: deriveProviderStatus(canon),
          transactionId: (order as any).paymentIntentId,
          currency,
          receipt_email: (order as any).email ?? undefined,
        };

  return {
    ...(order as any),
    status: canon,
    total,
    currency,
    shippingAddress: flattenShipping(order) ?? (order as any).shippingAddress,
    payment,
  } as Order;
}

/** FirestoreDate → ISO string (or undefined) for PATCH delivery.eta */
function toIsoString(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === 'function') {
    const d = v.toDate();
    return d ? d.toISOString() : undefined;
  }
  if (typeof v?.seconds === 'number') {
    const ms = v.seconds * 1000 + Math.round((v.nanoseconds || 0) / 1e6);
    return new Date(ms).toISOString();
  }
  return undefined;
}
// ──────────────────────────────────────────────────────────────────────────────

type UpdateOrderVars = Partial<{
  status: TOrderStatus;
  previousStatus: TOrderStatus | undefined;
  notes: string | null;
  delivery: { provider?: string; trackingNumber?: string; eta?: string };
  notifyCustomer?: boolean;
}>;

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
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();

  const { data: rawOrder, isLoading, isError, error } = useOrder(id);
  const order = useMemo(
    () => (rawOrder ? normalizeForView(rawOrder) : undefined),
    [rawOrder],
  );

  const updateOrderMutation = useUpdateOrder(id) as UpdateOrderMutation;

  // Keep most recent *normalized* order
  const orderRef = useRef<Order | undefined>(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // Keep raw order for sending un-normalized fields (e.g. previousStatus)
  const rawOrderRef = useRef<typeof rawOrder>(rawOrder);
  useEffect(() => {
    rawOrderRef.current = rawOrder;
  }, [rawOrder]);

  // RHF v8
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
      status: 'open' as TOrderStatus,
      notes: '',
      delivery: { provider: '', trackingNumber: '', eta: '' },
      items: [],
    },
  });

  // keep form in sync after order loads (use normalized)
  useEffect(() => {
    if (order) reset(order);
  }, [order, reset]);

  const currentStatus = watch('status');

  // submit guards + programmatic form submit
  const formRef = useRef<HTMLFormElement | null>(null);
  const submittingRef = useRef(false);

  const onSubmit: SubmitHandler<Order> = async (formData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const previousStatus =
        (rawOrderRef.current?.status as TOrderStatus | undefined) ??
        orderRef.current?.status;

      // Build a MINIMAL PATCH body that matches UpdateOrderDto on the server
      const etaStr = toIsoString((formData as any).delivery?.eta);

      const delivery =
        formData?.delivery &&
        (formData.delivery.provider ||
          formData.delivery.trackingNumber ||
          formData.delivery.eta)
          ? {
              provider: formData.delivery.provider || undefined,
              trackingNumber: formData.delivery.trackingNumber || undefined,
              eta: etaStr, // ensure string for server DTO
            }
          : undefined;

      const notifyCustomer = previousStatus !== formData.status;

      const patch: UpdateOrderVars = {
        status: formData.status as TOrderStatus,
        previousStatus: previousStatus as TOrderStatus | undefined,
        notes: formData.notes ?? null,
        delivery,
        notifyCustomer,
      };

      const run =
        updateOrderMutation.mutateAsync ??
        ((vars: UpdateOrderVars) =>
          new Promise<void>((resolve, reject) =>
            updateOrderMutation.mutate(vars, {
              onSuccess: () => resolve(),
              onError: (e: unknown) => reject(e),
            }),
          ));

      await run(patch);

      enqueueSnackbar(
        t('orderEdit.success', {
          defaultValue: 'Order updated successfully!',
        }),
        { variant: 'success', autoHideDuration: 3000 },
      );

      // redirect back to orders list
      navigate('/admin/orders');
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
      // keep submittingRef true on success to avoid accidental re-submits
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
                  {ORDER_STATUS.map((value) => (
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
              {order && (
                <>
                  <OrderCustomer order={order} />
                  <OrderShipping order={order} />
                  <OrderItems order={order} />
                  <OrderPayment order={order} />
                  <OrderTimestamps order={order} />
                </>
              )}
            </Stack>
          </Stack>

          {/* Hidden form element to centralize submission & validations */}
          <Box
            component="form"
            ref={formRef}
            onSubmit={(e) => {
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
