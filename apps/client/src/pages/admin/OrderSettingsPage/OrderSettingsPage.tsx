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
} from '../../../services/ability.service'; // pick the right subject in your app
import { useTranslation } from 'react-i18next';

type FormValues = { shipping: number; taxRate: number; discount: number };

export default function OrderSettingsPage() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useOrderSettings();
  const { mutateAsync, isPending } = useUpdateOrderSettingsMutation();
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: data ?? { shipping: 0, taxRate: 0, discount: 0 },
    values: data ?? { shipping: 0, taxRate: 0, discount: 0 }, // keep in sync when query resolves
  });

  const onSubmit = async (v: FormValues) => {
    await mutateAsync(v);
    setOpen(true);
  };

  if (isLoading) return <LoadingProgress />;

  return (
    <PageLayout
      action={EAbilityActions.MANAGE}
      subject={EAbilitySubjects.SETTINGS /* or SETTINGS if you have */}
    >
      <Box p={2} display="flex" justifyContent="center">
        <Paper sx={{ width: '100%', maxWidth: 640, p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">{t('orderSettings.title')}</Typography>

            <TextField
              label={t('orderSettings.shipping')}
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              {...register('shipping', { valueAsNumber: true, min: 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {t('currency.symbol')}
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label={t('orderSettings.taxRate')}
              type="number"
              inputProps={{ step: '0.01', min: 0, max: 1 }}
              {...register('taxRate', { valueAsNumber: true, min: 0, max: 1 })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    ({t('orderSettings.taxRateHint')})
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label={t('orderSettings.discount')}
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              {...register('discount', { valueAsNumber: true, min: 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {t('currency.symbol')}
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={1}>
              <Button
                variant="outlined"
                onClick={() => reset()}
                disabled={!isDirty || isPending}
              >
                {t('actions.reset')}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {t('actions.save')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Snackbar
        open={open}
        autoHideDuration={2000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="success" onClose={() => setOpen(false)}>
          {t('orderSettings.saved')}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
