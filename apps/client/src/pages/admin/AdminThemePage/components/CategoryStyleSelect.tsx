import React from 'react';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { ThemeSettings } from '../../../../api/theme';
import { CATEGORY_STYLES } from '@common/types';

interface Props {
  control: Control<ThemeSettings>;
}

export default function CategoryStyleSelect({ control }: Props) {
  return (
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
  );
}
