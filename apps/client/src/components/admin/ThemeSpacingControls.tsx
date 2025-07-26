import React from 'react';
import { Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import { ThemeSettings } from '../../api/theme';
import FormTextField from '../../components/FormTextField';

interface Props {
  control: Control<ThemeSettings>;
}

export default function ThemeSpacingControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <FormTextField
        label="Border Radius (px)"
        name="borderRadius"
        control={control}
        type="number"
        inputProps={{ min: 0, max: 64 }}
      />
      <FormTextField
        label="Spacing Scale"
        name="spacingScale"
        control={control}
        type="number"
        inputProps={{ min: 0, max: 64 }}
      />
    </Stack>
  );
}
