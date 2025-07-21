import React from 'react';
import { Controller } from 'react-hook-form';
import { TextField, MenuItem } from '@mui/material';
import type { Control } from 'react-hook-form';
import type { ThemeSettings } from '@client/api/theme';

import { CATEGORY_STYLES } from '@client/shared/types/category-style.enum';

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
