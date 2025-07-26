import React from 'react';
import { Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import FormTextField from '../../../../components/FormTextField';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  control: Control<ThemeSettings>;
}

export default function ColorPickerSection({ control }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormTextField
        label="Primary Color"
        name="primaryColor"
        type="color"
        control={control}
      />

      <FormTextField
        label="Secondary Color"
        name="secondaryColor"
        type="color"
        control={control}
      />
    </Stack>
  );
}
