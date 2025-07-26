import React from 'react';
import { Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import { ThemeSettings } from '../../../../api/theme';
import { HOMEPAGE_LAYOUTS, PRODUCT_CARD_VARIANT_LABELS } from '@common/types';
import FormTextField from '../../../../components/FormTextField';

interface Props {
  control: Control<ThemeSettings>;
}

export default function LayoutAndCardControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <FormTextField
        label="Homepage Layout"
        name="homepageLayout"
        control={control}
        isSelect
        selectOptions={Object.entries(HOMEPAGE_LAYOUTS).map(
          ([label, value]) => ({
            label,
            value,
          }),
        )}
      />

      <FormTextField
        label="Product Card Variant"
        name="productCardVariant"
        control={control}
        isSelect
        selectOptions={Object.entries(PRODUCT_CARD_VARIANT_LABELS).map(
          ([label, value]) => ({
            label,
            value,
          }),
        )}
      />
    </Stack>
  );
}
