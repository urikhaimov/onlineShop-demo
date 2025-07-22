import React from 'react';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { ThemeSettings } from '../../../../api/theme';
import { HOMEPAGE_LAYOUTS, PRODUCT_CARD_VARIANT_LABELS } from '@common/types';

interface Props {
  control: Control<ThemeSettings>;
}

export default function LayoutAndCardControls({ control }: Props) {
  return (
    <Stack spacing={2}>
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
    </Stack>
  );
}
