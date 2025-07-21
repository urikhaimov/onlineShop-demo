// src/pages/admin/AdminThemePage/components/FontSelectWithControls.tsx

import React from 'react';
import { Controller } from 'react-hook-form';
import { TextField, MenuItem, Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import type { ThemeSettings } from '@client/api/theme';
import { loadGoogleFont } from '@client/utils/loadGoogleFont';

interface Props {
  control: Control<ThemeSettings>;
}

const FONT_OPTIONS = ['Roboto', 'Open Sans', 'Inter', 'Orbitron', 'Poppins'];

export default function FontSelectWithControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <Controller
        name="fontFamily"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Font Family"
            {...field}
            onChange={(e) => {
              const value = e.target.value;
              field.onChange(value);
              loadGoogleFont(value);
            }}
          >
            {FONT_OPTIONS.map((font) => (
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
          <TextField
            type="number"
            label="Font Size (px)"
            {...field}
            inputProps={{ min: 10, max: 32 }}
          />
        )}
      />

      <Controller
        name="fontWeight"
        control={control}
        render={({ field }) => (
          <TextField
            type="number"
            label="Font Weight"
            {...field}
            inputProps={{ min: 100, max: 900, step: 100 }}
          />
        )}
      />
    </Stack>
  );
}
