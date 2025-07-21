// src/components/theme/ThemeEditorForm.tsx
import React, { useEffect } from 'react';
import {
  Box, Button, Stack, TextField, MenuItem, Typography, Switch, FormControlLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { themePresets } from '@client/constants/themePresets';
import { ThemeSettings } from '@client/api/theme';
import { useThemeSettings, useUpdateThemeSettingsMutation } from '@client/hooks/useThemeHooks';

const fontOptions = ['Roboto', 'Open Sans', 'Inter', 'Orbitron', 'Poppins'];

const maxWidthOptions: ThemeSettings['maxWidth'][] = ['sm', 'md', 'lg', 'xl', 'full'];

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
  const { data, isLoading } = useThemeSettings();
  const { mutate: updateTheme } = useUpdateThemeSettingsMutation();

  const {
    control, handleSubmit, reset, watch,
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
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h5" mb={2}>🎨 Theme Settings</Typography>

      <Stack spacing={2}>
        <TextField
          select
          label="Theme Preset"
          defaultValue=""
          onChange={(e) => handlePresetChange(e.target.value)}
        >
          <MenuItem value="">Select a preset</MenuItem>
          {Object.keys(themePresets).map((key) => (
            <MenuItem key={key} value={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </MenuItem>
          ))}
        </TextField>

        <Controller
          name="storeName"
          control={control}
          rules={{ required: 'Store name is required' }}
          render={({ field }) => (
            <TextField {...field} label="Store Name" fullWidth error={!!errors.storeName} helperText={errors.storeName?.message} />
          )}
        />

        <Controller
          name="primaryColor"
          control={control}
          rules={{ required: 'Primary color is required' }}
          render={({ field }) => (
            <TextField {...field} label="Primary Color" type="color" fullWidth error={!!errors.primaryColor} helperText={errors.primaryColor?.message} />
          )}
        />

        <Controller
          name="secondaryColor"
          control={control}
          rules={{ required: 'Secondary color is required' }}
          render={({ field }) => (
            <TextField {...field} label="Secondary Color" type="color" fullWidth error={!!errors.secondaryColor} helperText={errors.secondaryColor?.message} />
          )}
        />

        <Controller
          name="fontFamily"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Font Family" select fullWidth>
              {fontOptions.map((font) => (
                <MenuItem key={font} value={font}>
                  {font}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          name="fontSize"
          control={control}
          render={({ field }) => (
            <TextField {...field} type="number" label="Font Size" fullWidth />
          )}
        />

        <Controller
          name="fontWeight"
          control={control}
          render={({ field }) => (
            <TextField {...field} type="number" label="Font Weight" fullWidth />
          )}
        />

        <Controller
          name="maxWidth"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Max Width" fullWidth>
              {maxWidthOptions.map((size) => (
                <MenuItem key={size} value={size}>{size}</MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          name="darkMode"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Enable Dark Mode"
            />
          )}
        />

        <Controller
          name="showSidebar"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Show Sidebar"
            />
          )}
        />

        <Controller
          name="stickyHeader"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Sticky Header"
            />
          )}
        />

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Save Theme
        </Button>
      </Stack>
    </Box>
  );
}
