// AdminThemePage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Popover,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import { Controller, useForm } from 'react-hook-form';
import { SketchPicker } from 'react-color';
import { themePresets } from '@client/constants/themePresets';
import { loadGoogleFont } from '@client/utils/loadGoogleFont';
import {
  useThemeSettings,
  useUpdateThemeSettingsMutation,
} from '@client/hooks/useThemeHooks';
import { ThemeSettings } from '@client/api/theme';
import { headerHeight, footerHeight } from '@client/config/themeConfig';
import ThemeSpacingControls from '../../../components/admin/ThemeSpacingControls';
import PictureUploaderWithCrop from '@client/components/PictureUploaderWithCrop';
import uploadSingleFileAndReturnUrl from '@client/utils/uploadSingleFileAndReturnUrl';
import { CATEGORY_STYLES } from '@client/shared/types/category-style.enum';
import { HOMEPAGE_LAYOUTS } from '@client/shared/types/theme-settings.enum';
import { PRODUCT_CARD_VARIANT_LABELS } from '@client/shared/types/product-card-invariant.enum';
export default function AdminThemePage() {
  const { data, isLoading } = useThemeSettings();
  const { mutate, isPending } = useUpdateThemeSettingsMutation();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ThemeSettings>({
    defaultValues: data,
  });

  const selectedFont = watch('fontFamily');
  const [colorAnchor, setColorAnchor] = useState<null | HTMLElement>(null);
  const [currentColorField, setCurrentColorField] = useState<
    'primaryColor' | 'secondaryColor' | null
  >(null);

  useEffect(() => {
    loadGoogleFont(selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = (values: ThemeSettings) => {
    mutate(values);
  };

  const applyPreset = (presetName: keyof typeof themePresets) => {
    const preset = themePresets[presetName];
    reset(preset);
    loadGoogleFont(preset.fontFamily);
  };

  const handleColorClick = (
    e: React.MouseEvent<HTMLElement>,
    field: 'primaryColor' | 'secondaryColor',
  ) => {
    setColorAnchor(e.currentTarget);
    setCurrentColorField(field);
  };

  const handleColorClose = () => {
    setColorAnchor(null);
    setCurrentColorField(null);
  };

  const exportTheme = () => {
    const json = JSON.stringify(watch(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-settings.json';
    a.click();
  };

  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = JSON.parse(text);
      reset(parsed);
    };
    reader.readAsText(file);
  };

  if (isLoading || !data) {
    return <Typography sx={{ p: 3 }}>Loading theme settings...</Typography>;
  }

  return (
    <Box
      sx={{
        mt: `${headerHeight}px`,
        mb: `${footerHeight}px`,
        minHeight: `calc(100vh - ${headerHeight + footerHeight}px)`,
        mx: 'auto',
        px: 2,
        py: 4,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Edit Theme
      </Typography>

      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {Object.keys(themePresets).map((key) => (
          <Button
            key={key}
            variant="outlined"
            onClick={() => applyPreset(key as keyof typeof themePresets)}
          >
            {key}
          </Button>
        ))}
      </Stack>

      <Controller
        name="storeName"
        control={control}
        render={({ field }) => <TextField label="Store Name" {...field} />}
      />
      <Controller
        name="logoUrl"
        control={control}
        render={({ field }) => (
          <PictureUploaderWithCrop
            avatarUrl={field.value}
            onCropUpload={async (file) => {
              // Upload to Firebase, Cloudinary, or your backend
              const uploadedUrl = await uploadSingleFileAndReturnUrl(file); // you implement this
              field.onChange(uploadedUrl); // update logoUrl field in form
            }}
            onDeleteAvatar={() => field.onChange(null)}
          />
        )}
      />
      <Controller
        name="darkMode"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} />}
            label="Dark Mode"
          />
        )}
      />
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2} maxWidth={600}>
          {(['primaryColor', 'secondaryColor'] as const).map((field) => (
            <Controller
              key={field}
              name={field}
              control={control}
              render={({ field: ctrlField }) => (
                <Box>
                  <Typography>
                    {field === 'primaryColor' ? 'Primary' : 'Secondary'} Color
                  </Typography>
                  <Button
                    onClick={(e) => handleColorClick(e, field)}
                    sx={{
                      bgcolor: ctrlField.value,
                      width: 100,
                      height: 36,
                      color: '#000',
                    }}
                  >
                    {ctrlField.value}
                  </Button>
                  {currentColorField === field && (
                    <Popover
                      open={!!colorAnchor}
                      anchorEl={colorAnchor}
                      onClose={handleColorClose}
                    >
                      <SketchPicker
                        color={ctrlField.value}
                        onChangeComplete={(color) =>
                          ctrlField.onChange(color.hex)
                        }
                      />
                    </Popover>
                  )}
                </Box>
              )}
            />
          ))}

          <Controller
            name="fontFamily"
            control={control}
            render={({ field }) => (
              <TextField select label="Font" {...field}>
                <MenuItem value="Roboto">Roboto</MenuItem>
                <MenuItem value="Open Sans">Open Sans</MenuItem>
                <MenuItem value="Inter">Inter</MenuItem>
                <MenuItem value="Orbitron">Orbitron</MenuItem>
              </TextField>
            )}
          />

          <Controller
            name="fontSize"
            control={control}
            render={({ field }) => (
              <TextField type="number" label="Font Size" {...field} />
            )}
          />
          <Controller
            name="fontWeight"
            control={control}
            render={({ field }) => (
              <TextField type="number" label="Font Weight" {...field} />
            )}
          />
          <ThemeSpacingControls control={control} />

          <Controller
            name="maxWidth"
            control={control}
            render={({ field }) => (
              <TextField select label="Max Width" {...field}>
                <MenuItem value="sm">sm</MenuItem>
                <MenuItem value="md">md</MenuItem>
                <MenuItem value="lg">lg</MenuItem>
                <MenuItem value="xl">xl</MenuItem>
                <MenuItem value="full">full</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="homepageLayout"
            control={control}
            render={({ field }) => (
              <TextField select label="Homepage Layout" {...field}>
                {Object.entries(HOMEPAGE_LAYOUTS).map(([label, value]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="productCardVariant"
            control={control}
            render={({ field }) => (
              <TextField select label="Product Card Variant" {...field}>
                {Object.entries(PRODUCT_CARD_VARIANT_LABELS).map(
                  ([label, value]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ),
                )}
              </TextField>
            )}
          />
          <Controller
            name="categoryStyle"
            control={control}
            render={({ field }) => (
              <TextField select label="Category Style" {...field}>
                {Object.entries(CATEGORY_STYLES).map(([label, value]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="showSidebar"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Show Sidebar"
              />
            )}
          />
          <Controller
            name="stickyHeader"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Sticky Header"
              />
            )}
          />
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Theme'}
            </Button>
            <Button variant="outlined" onClick={exportTheme}>
              Export Theme
            </Button>
            <Button variant="outlined" component="label">
              Import Theme
              <input
                hidden
                type="file"
                accept="application/json"
                onChange={(e) => {
                  if (e.target.files?.[0]) importTheme(e.target.files[0]);
                }}
              />
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Live Preview */}
      <Box mt={6} p={4} border="1px dashed grey" borderRadius={2}>
        <Typography
          variant="h6"
          sx={{ fontFamily: selectedFont, color: watch('primaryColor') }}
        >
          Theme Preview
        </Typography>
        <Box
          sx={{
            bgcolor: watch('secondaryColor'),
            p: watch('spacingScale') || 2,
            borderRadius: `${watch('borderRadius') || 4}px`,
            mt: 2,
          }}
        >
          <Typography>This is your live theme preview.</Typography>
        </Box>
      </Box>
    </Box>
  );
}
