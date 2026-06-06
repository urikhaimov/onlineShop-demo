// src/pages/admin/AdminThemePage/components/FontSelectWithControls.tsx

import React from 'react';
import { Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import { ThemeSettings } from '../../../../api/theme';
import { loadGoogleFont } from '../../../../utils/loadGoogleFont';
import FormTextField from '../../../../components/FormTextField';

interface Props {
  control: Control<ThemeSettings>;
}

const FONT_OPTIONS = [
  'Noto Sans Hebrew',
  'Open Sans',
  'Inter',
  'Orbitron',
  'Poppins',
];

export default function FontSelectWithControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <FormTextField
        label="Font Family"
        name="fontFamily"
        control={control}
        isSelect
        selectOptions={FONT_OPTIONS.map((font) => ({
          label: font,
          value: font,
        }))}
        onChangeCustom={(e, onChange) => {
          const value = (e.target as HTMLInputElement).value;
          onChange(value);
          loadGoogleFont(value);
        }}
      />

      <FormTextField
        label="Font Size (px)"
        name="fontSize"
        control={control}
        type="number"
        slotProps={{ htmlInput: { min: 10, max: 32 } }}
      />

      <FormTextField
        label="Font Weight"
        name="fontWeight"
        control={control}
        type="number"
        slotProps={{ htmlInput: { min: 100, max: 900, step: 100 } }}
      />
    </Stack>
  );
}
