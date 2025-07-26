import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { themePresets } from '../constants/themePresets';
import { ThemeSettings } from '../api/theme';
import {
  useThemeSettings,
  useUpdateThemeSettingsMutation,
} from '../hooks/useThemeHooks';
import FormTextField from '../components/FormTextField';

const fontOptions = ['Roboto', 'Open Sans', 'Inter', 'Orbitron', 'Poppins'];
const maxWidthOptions: ThemeSettings['maxWidth'][] = [
  'sm',
  'md',
  'lg',
  'xl',
  'full',
];

const defaultValues: ThemeSettings = {
  storeName: '',
  logoUrl: null,
  darkMode: false,
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  fontFamily: 'Roboto',
  fontSize: 16,
  fontWeight: 400,
  spacingScale: 2,
  borderRadius: 12,
  maxWidth: 'lg',
  homepageLayout: 'hero',
  productCardVariant: 'compact',
  categoryStyle: 'tabs',
  showSidebar: true,
  stickyHeader: true,
};

export default function ThemeEditorForm() {
  const { data } = useThemeSettings();
  const { mutate: updateTheme } = useUpdateThemeSettingsMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ThemeSettings>({ defaultValues });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = (values: ThemeSettings) => {
    updateTheme(values);
  };

  const handlePresetChange = (presetKey: string) => {
    const preset = themePresets[presetKey as keyof typeof themePresets];
    if (preset) reset({ ...preset, maxWidth: 'lg' });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ maxWidth: 600, mx: 'auto', p: 2 }}
    >
      <Typography variant="h5" mb={2}>
        🎨 Theme Settings
      </Typography>

      <Stack spacing={2}>
        <FormTextField
          label="Theme Preset"
          select
          SelectProps={{ native: false }}
          onChange={(e) => handlePresetChange(e.target.value)}
          fullWidth
          value=""
        >
          <MenuItem value="">Select a preset</MenuItem>
          {Object.keys(themePresets).map((key) => (
            <MenuItem key={key} value={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </MenuItem>
          ))}
        </FormTextField>

        <FormTextField
          label="Store Name"
          name="storeName"
          control={control}
          errorObject={errors.storeName}
          required
        />

        <FormTextField
          label="Primary Color"
          name="primaryColor"
          control={control}
          type="color"
          errorObject={errors.primaryColor}
          required
        />

        <FormTextField
          label="Secondary Color"
          name="secondaryColor"
          control={control}
          type="color"
          errorObject={errors.secondaryColor}
          required
        />

        <FormTextField
          label="Font Family"
          name="fontFamily"
          control={control}
          isSelect
          selectOptions={fontOptions.map((f) => ({ label: f, value: f }))}
        />

        <FormTextField
          label="Font Size"
          name="fontSize"
          control={control}
          type="number"
        />

        <FormTextField
          label="Font Weight"
          name="fontWeight"
          control={control}
          type="number"
        />

        <FormTextField
          label="Max Width"
          name="maxWidth"
          control={control}
          isSelect
          selectOptions={maxWidthOptions.map((val) => ({
            label: val,
            value: val,
          }))}
        />

        <FormControlLabel
          control={
            <Switch
              onChange={(e) => setValue('darkMode', e.target.checked)}
              checked={!!getValues('darkMode')}
            />
          }
          label="Enable Dark Mode"
        />

        <FormControlLabel
          control={
            <Switch
              onChange={(e) => setValue('showSidebar', e.target.checked)}
              checked={!!getValues('showSidebar')}
            />
          }
          label="Show Sidebar"
        />

        <FormControlLabel
          control={
            <Switch
              onChange={(e) => setValue('stickyHeader', e.target.checked)}
              checked={!!getValues('stickyHeader')}
            />
          }
          label="Sticky Header"
        />

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Save Theme
        </Button>
      </Stack>
    </Box>
  );
}
