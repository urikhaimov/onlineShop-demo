import React from 'react';
import { Controller } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import type { Control } from 'react-hook-form';
import type { ThemeSettings } from '@client/api/theme';

import { HOMEPAGE_LAYOUTS } from '@client/shared/types/theme-settings.enum';
import { PRODUCT_CARD_VARIANT_LABELS } from '@client/shared/types/product-card-invariant.enum';

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
            {Object.entries(PRODUCT_CARD_VARIANT_LABELS).map(([label, value]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}
