import React, { useState } from 'react';
import {
  Box,
  Button,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Paper,
  Stack,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  Store,
  Palette,
  Image,
  ShoppingCart,
  CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useUpdateThemeMutation } from '../../../hooks/useUpdateThemeMutation';
import {
  useLandingPage,
  useUpdateLandingPage,
} from '../../../hooks/useLandingPage';
import {
  useOrderSettings,
  useUpdateOrderSettingsMutation,
} from '../../../hooks/useOrderSettings';

const STEPS = [
  { label: 'Store Identity', icon: <Store /> },
  { label: 'Branding', icon: <Palette /> },
  { label: 'Landing Page', icon: <Image /> },
  { label: 'Order Settings', icon: <ShoppingCart /> },
  { label: 'Done!', icon: <CheckCircle /> },
];

// ─── Step 1: Store Identity ───────────────────────────────────────────────────
function StoreIdentityStep({
  onNext,
}: {
  onNext: (data: Record<string, unknown>) => void;
}) {
  const { themeSettings } = useThemeStore();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      storeName: themeSettings.storeName || '',
      logoUrl: themeSettings.logoUrl || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Start with your store's basic identity. This appears in the header,
          emails, and browser tab.
        </Typography>
        <TextField
          label="Store Name"
          fullWidth
          {...register('storeName', { required: 'Store name is required' })}
          placeholder="e.g. Bunder Shop"
        />
        <TextField
          label="Logo URL"
          fullWidth
          {...register('logoUrl')}
          placeholder="https://example.com/logo.png"
          helperText="Leave blank to use the store name as text"
        />
        <Button type="submit" variant="contained" size="large">
          Save & Continue
        </Button>
      </Stack>
    </form>
  );
}

// ─── Step 2: Branding ─────────────────────────────────────────────────────────
function BrandingStep({
  onNext,
  onBack,
}: {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const { themeSettings } = useThemeStore();
  const { control, handleSubmit, register } = useForm({
    defaultValues: {
      primaryColor: themeSettings.primaryColor || '#1976d2',
      secondaryColor: themeSettings.secondaryColor || '#9c27b0',
      darkMode: themeSettings.darkMode || false,
      fontFamily:
        themeSettings.fontFamily ||
        'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
      borderRadius: themeSettings.borderRadius ?? 12,
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Define your store's look and feel — colors and typography.
        </Typography>

        <Stack direction="row" spacing={3}>
          <Stack spacing={1} flex={1}>
            <Typography variant="caption" color="text.secondary">
              Primary Color
            </Typography>
            <input
              type="color"
              style={{
                width: '100%',
                height: 48,
                cursor: 'pointer',
                borderRadius: 8,
              }}
              {...register('primaryColor')}
            />
          </Stack>
          <Stack spacing={1} flex={1}>
            <Typography variant="caption" color="text.secondary">
              Secondary Color
            </Typography>
            <input
              type="color"
              style={{
                width: '100%',
                height: 48,
                cursor: 'pointer',
                borderRadius: 8,
              }}
              {...register('secondaryColor')}
            />
          </Stack>
        </Stack>

        <Controller
          name="darkMode"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Dark mode by default"
            />
          )}
        />

        <TextField
          label="Font Family"
          fullWidth
          {...register('fontFamily')}
          placeholder="Inter, system-ui, Arial, sans-serif"
        />

        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Border Radius (px)
          </Typography>
          <Controller
            name="borderRadius"
            control={control}
            render={({ field }) => (
              <Slider
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                min={0}
                max={32}
                marks={[
                  { value: 0, label: 'Sharp' },
                  { value: 16, label: 'Rounded' },
                  { value: 32, label: 'Pill' },
                ]}
                valueLabelDisplay="auto"
              />
            )}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onBack} sx={{ flex: 1 }}>
            Back
          </Button>
          <Button type="submit" variant="contained" sx={{ flex: 2 }}>
            Save & Continue
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

// ─── Step 3: Landing Page ─────────────────────────────────────────────────────
function LandingPageStep({
  onNext,
  onBack,
}: {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const { data: lp } = useLandingPage();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: lp?.title || 'Welcome to Our Store',
      subtitle: lp?.subtitle || 'Curated essentials for everyday life',
      bannerImageUrl: lp?.bannerImageUrl || '',
      ctaButtonText: lp?.ctaButtonText || 'Shop Now',
      ctaButtonLink: lp?.ctaButtonLink || '/products',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Configure your homepage hero section — what visitors see first.
        </Typography>
        <TextField label="Hero Title" fullWidth {...register('title')} />
        <TextField
          label="Subtitle / Tagline"
          fullWidth
          {...register('subtitle')}
        />
        <TextField
          label="Banner Image URL"
          fullWidth
          {...register('bannerImageUrl')}
          placeholder="https://example.com/banner.jpg"
          helperText="Recommended: 1400×500px"
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="CTA Button Text"
            fullWidth
            {...register('ctaButtonText')}
          />
          <TextField
            label="CTA Button Link"
            fullWidth
            {...register('ctaButtonLink')}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onBack} sx={{ flex: 1 }}>
            Back
          </Button>
          <Button type="submit" variant="contained" sx={{ flex: 2 }}>
            Save & Continue
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

// ─── Step 4: Order Settings ───────────────────────────────────────────────────
function OrderSettingsStep({
  onNext,
  onBack,
}: {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const { data: settings } = useOrderSettings();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      shipping: settings?.shipping ?? 0,
      taxRate: (settings?.taxRate ?? 0) * 100,
      discount: settings?.discount ?? 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Set your store's pricing rules. You can change these any time from
          Order Settings.
        </Typography>
        <TextField
          label="Shipping Cost (₪)"
          type="number"
          fullWidth
          {...register('shipping', { valueAsNumber: true, min: 0 })}
          helperText="0 = free shipping"
        />
        <TextField
          label="Tax Rate (%)"
          type="number"
          fullWidth
          {...register('taxRate', { valueAsNumber: true, min: 0, max: 100 })}
          helperText="e.g. 17 for 17% VAT"
        />
        <TextField
          label="Global Discount (₪)"
          type="number"
          fullWidth
          {...register('discount', { valueAsNumber: true, min: 0 })}
          helperText="0 = no discount"
        />
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onBack} sx={{ flex: 1 }}>
            Back
          </Button>
          <Button type="submit" variant="contained" sx={{ flex: 2 }}>
            Save & Finish
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────
function DoneStep({ storeName }: { storeName: string }) {
  const navigate = useNavigate();

  const links = [
    { label: 'Products', path: '/admin/products', desc: 'Add your products' },
    {
      label: 'Categories',
      path: '/admin/categories',
      desc: 'Organise by category',
    },
    {
      label: 'Landing Page',
      path: '/admin/landingPage',
      desc: 'Fine-tune the homepage',
    },
    { label: 'Theme', path: '/admin/theme', desc: 'Advanced styling' },
    { label: 'Orders', path: '/admin/orders', desc: 'Manage customer orders' },
  ];

  return (
    <Stack spacing={3} alignItems="center" textAlign="center">
      <CheckCircle sx={{ fontSize: 72, color: 'success.main' }} />
      <Typography variant="h5" fontWeight={700}>
        {storeName || 'Your store'} is ready!
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Setup complete. Here's what to do next:
      </Typography>

      <Stack spacing={1.5} width="100%" textAlign="left">
        {links.map((l) => (
          <Paper
            key={l.path}
            variant="outlined"
            sx={{
              p: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigate(l.path)}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {l.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {l.desc}
              </Typography>
            </Box>
            <Chip label="Go →" size="small" variant="outlined" />
          </Paper>
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => navigate('/admin')}
      >
        Go to Admin Dashboard
      </Button>
    </Stack>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function AdminSetupWizardPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const { loadTheme } = useThemeStore();
  const updateTheme = useUpdateThemeMutation();
  const { mutateAsync: updateLandingPage } = useUpdateLandingPage();
  const { mutateAsync: updateOrderSettings } = useUpdateOrderSettingsMutation();

  const save = async (step: number, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (step === 0) {
        await updateTheme.mutateAsync({
          storeName: data.storeName as string,
          logoUrl: (data.logoUrl as string) || null,
        });
        setStoreName(data.storeName as string);
      }
      if (step === 1) {
        await updateTheme.mutateAsync({
          primaryColor: data.primaryColor as string,
          secondaryColor: data.secondaryColor as string,
          darkMode: data.darkMode as boolean,
          fontFamily: data.fontFamily as string,
          borderRadius: data.borderRadius as number,
        });
        await loadTheme();
      }
      if (step === 2) {
        await updateLandingPage({
          title: data.title as string,
          subtitle: data.subtitle as string,
          bannerImageUrl: data.bannerImageUrl as string,
          ctaButtonText: data.ctaButtonText as string,
          ctaButtonLink: data.ctaButtonLink as string,
          homepageLayout: 'hero',
        } as any);
      }
      if (step === 3) {
        await updateOrderSettings({
          shipping: Number(data.shipping),
          taxRate: Number(data.taxRate) / 100,
          discount: Number(data.discount),
        });
      }
      setActiveStep((s) => s + 1);
    } catch {
      enqueueSnackbar(
        t('common.saveFailed', { defaultValue: 'Failed to save. Try again.' }),
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Store Setup Wizard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure your store in a few steps. Everything can be changed later.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((s) => (
          <Step key={s.label}>
            <StepLabel>{s.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        {saving && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!saving && activeStep === 0 && (
          <StoreIdentityStep onNext={(d) => save(0, d)} />
        )}
        {!saving && activeStep === 1 && (
          <BrandingStep
            onNext={(d) => save(1, d)}
            onBack={() => setActiveStep(0)}
          />
        )}
        {!saving && activeStep === 2 && (
          <LandingPageStep
            onNext={(d) => save(2, d)}
            onBack={() => setActiveStep(1)}
          />
        )}
        {!saving && activeStep === 3 && (
          <OrderSettingsStep
            onNext={(d) => save(3, d)}
            onBack={() => setActiveStep(2)}
          />
        )}
        {!saving && activeStep === 4 && <DoneStep storeName={storeName} />}
      </Paper>
    </Box>
  );
}
