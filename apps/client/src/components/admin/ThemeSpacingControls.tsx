// src/pages/admin/AdminThemePage/components/ThemeSpacingControls.tsx
import React from 'react';
import { Stack, TextField } from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import { ThemeSettings } from '@client/api/theme';

interface Props {
  control: Control<ThemeSettings>;
}

export default function ThemeSpacingControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <Controller
        name="borderRadius"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            type="number"
            label="Border Radius (px)"
            inputProps={{ min: 0, max: 64 }}
          />
        )}
      />
      <Controller
        name="spacingScale"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            type="number"
            label="Spacing Scale"
            inputProps={{ min: 0, max: 64 }}
          />
        )}
      />
    </Stack>
  );
}
