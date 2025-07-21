// ... all existing imports
import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useThemeSettings, useUpdateThemeSettingsMutation } from '@client/hooks/useThemeHooks';
import { ThemeSettings } from '@client/api/theme';
import { headerHeight, footerHeight } from '@client/config/themeConfig';
import { themePresets } from '@client/constants/themePresets';

import DarkModeToggle from './components/DarkModeToggle';
import ToggleOptions from './components/ToggleOptions';
import StoreNameField from './components/StoreNameField';
import ColorPickerSection from './components/ColorPickerSection';
import PictureUploaderWithCrop from '@client/components/PictureUploaderWithCrop';

import ThemeImportExportPanel from './components/ThemeImportExportPanel';
import ThemePreview from './components/ThemePreview';
import FontSelectWithControls from './components/FontSelectWithControls';
import ThemeSpacingControls from './components/ThemeSpacingControls';
import LayoutAndCardControls from './components/LayoutAndCardControls';
import CategoryStyleSelect from './components/CategoryStyleSelect';
import uploadSingleFileAndReturnUrl from '@client/utils/uploadSingleFileAndReturnUrl'
export default function AdminThemePage() {
  const { data, isLoading } = useThemeSettings();
  const { mutate, isPending } = useUpdateThemeSettingsMutation();

  const {
    control,
    handleSubmit,
    watch,
    reset,
  } = useForm<ThemeSettings>({
    defaultValues: data,
  });

  React.useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  if (isLoading || !data) {
    return <Typography sx={{ p: 3 }}>Loading theme settings...</Typography>;
  }

  const onSubmit = (values: ThemeSettings) => {
    mutate(values);
  };

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

      {/* Presets */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {Object.keys(themePresets).map((key) => (
          <Button
            key={key}
            variant="outlined"
            onClick={() => reset(themePresets[key as keyof typeof themePresets])}
          >
            {key}
          </Button>
        ))}
      </Stack>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} maxWidth={700}>
          <StoreNameField control={control} />
          <Controller
            name="logoUrl"
            control={control}
            render={({ field }) => (
              <PictureUploaderWithCrop
                avatarUrl={field.value}
                onCropUpload={async (file) => {
                  const uploaded = await uploadSingleFileAndReturnUrl(file);
                  field.onChange(uploaded);
                }}
                onDeleteAvatar={() => field.onChange(null)}
              />
            )}
          />
          <DarkModeToggle control={control} />
          <ColorPickerSection control={control} />
          <FontSelectWithControls control={control} />
          <ThemeSpacingControls control={control} />
          <LayoutAndCardControls control={control} />
          <CategoryStyleSelect control={control} />
          <ToggleOptions control={control} />
          <ThemeImportExportPanel watch={watch} reset={reset} />

          {/* ✅ Save/Cancel Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => reset(data)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ThemePreview watch={watch} />
    </Box>
  );
}
