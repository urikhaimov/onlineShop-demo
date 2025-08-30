// src/pages/admin/settings/OrderSettingsPage.tsx
import * as React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import {
  useOrderSettings,
  useUpdateOrderSettingsMutation,
} from '../../../hooks/useOrderSettings';
import LoadingProgress from '../../../components/LoadingProgress';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

type FormValues = { shipping: number; taxRate: number; discount: number };

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds?: number };
    const d = new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export default function OrderSettingsPage() {
  const { t } = useTranslation('common');

  // Load current settings
  const { data, isLoading, isError, error } = useOrderSettings();

  // Save updates
  const {
    mutateAsync,
    isPending: saving,
    error: saveError,
  } = useUpdateOrderSettingsMutation();

  const [successOpen, setSuccessOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    defaultValues: { shipping: 0, taxRate: 0, discount: 0 },
    mode: 'onChange',
  });

  // Re-sync form whenever remote data changes
  React.useEffect(() => {
    if (data) {
      reset({
        shipping: Number(data.shipping ?? 0),
        taxRate: Number(data.taxRate ?? 0),
        discount: Number(data.discount ?? 0),
      });
    }
  }, [data, reset]);

  const onSubmit = async (v: FormValues) => {
    // Sanity clamp taxRate into [0..1]
    const next = {
      shipping: Number.isFinite(v.shipping) ? v.shipping : 0,
      taxRate: Number.isFinite(v.taxRate)
        ? Math.min(1, Math.max(0, v.taxRate))
        : 0,
      discount: Number.isFinite(v.discount) ? v.discount : 0,
    };
    await mutateAsync(next);
    setSuccessOpen(true);
    // Reset dirty state to the just-saved values
    reset(next);
  };

  if (isLoading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.SETTINGS}
    >
      <Box p={2} display="flex" justifyContent="center">
        <Paper sx={{ width: '100%', maxWidth: 680, p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">
              {t('orderSettings.title', { defaultValue: 'Order Settings' })}
            </Typography>

            {isError && (
              <Alert severity="warning">
                {t('orderSettings.loadFailed', {
                  defaultValue: 'Failed to load settings. Using defaults.',
                })}{' '}
                {String(error ?? '')}
              </Alert>
            )}

            {/* Shipping */}
            <TextField
              label={t('orderSettings.shipping', { defaultValue: 'Shipping' })}
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              {...register('shipping', {
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: t('validation.min0', {
                    defaultValue: 'Must be ≥ 0',
                  }),
                },
              })}
              error={!!errors.shipping}
              helperText={errors.shipping?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {t('currency.symbol', { defaultValue: '₪' })}
                  </InputAdornment>
                ),
              }}
            />

            {/* Tax Rate */}
            <TextField
              label={t('orderSettings.taxRate', { defaultValue: 'Tax Rate' })}
              type="number"
              inputProps={{ step: '0.01', min: 0, max: 1 }}
              {...register('taxRate', {
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: t('validation.min0', {
                    defaultValue: 'Must be ≥ 0',
                  }),
                },
                max: {
                  value: 1,
                  message: t('validation.max1', {
                    defaultValue: 'Must be ≤ 1.00',
                  }),
                },
              })}
              error={!!errors.taxRate}
              helperText={
                errors.taxRate?.message ??
                t('orderSettings.taxRateHint', {
                  defaultValue: 'Use a fraction (e.g., 0.17 for 17%)',
                })
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {t('orderSettings.fraction', { defaultValue: '(0..1)' })}
                  </InputAdornment>
                ),
              }}
            />

            {/* Discount */}
            <TextField
              label={t('orderSettings.discount', { defaultValue: 'Discount' })}
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              {...register('discount', {
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: t('validation.min0', {
                    defaultValue: 'Must be ≥ 0',
                  }),
                },
              })}
              error={!!errors.discount}
              helperText={errors.discount?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {t('currency.symbol', { defaultValue: '₪' })}
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={1}>
              <Button
                variant="outlined"
                onClick={() =>
                  data
                    ? reset({
                        shipping: Number(data.shipping ?? 0),
                        taxRate: Number(data.taxRate ?? 0),
                        discount: Number(data.discount ?? 0),
                      })
                    : reset({ shipping: 0, taxRate: 0, discount: 0 })
                }
                disabled={!isDirty || saving}
              >
                {t('actions.reset', { defaultValue: 'Reset' })}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
              >
                {t('actions.save', { defaultValue: 'Save' })}
              </Button>
            </Stack>

            {(saveError as any) && (
              <Alert severity="error">
                {t('orderSettings.saveFailed', {
                  defaultValue:
                    'Failed to save. You may not have permission or the network failed.',
                })}{' '}
                {String(saveError)}
              </Alert>
            )}

            {/* Metadata footer (read-only) */}
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              {t('orderSettings.lastUpdated', { defaultValue: 'Last updated' })}
              :{' '}
              {(() => {
                const d = asDate(data?.updatedAt);
                return d
                  ? d.toLocaleString()
                  : t('common.na', { defaultValue: 'N/A' });
              })()}
              {' · '}
              {t('orderSettings.by', { defaultValue: 'by' })}{' '}
              {data?.updatedBy?.name ||
                data?.updatedBy?.uid ||
                t('common.system', { defaultValue: 'system' })}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      <Snackbar
        open={successOpen}
        autoHideDuration={2200}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          {t('orderSettings.saved', { defaultValue: 'Settings saved' })}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
