import React from 'react';
import type { Control } from 'react-hook-form';
import { ThemeSettings } from '../../../../api/theme';
import { CATEGORY_STYLES } from '@common/types';
import FormTextField from '../../../../components/FormTextField';

interface Props {
  control: Control<ThemeSettings>;
}

export default function CategoryStyleSelect({ control }: Props) {
  return (
    <FormTextField
      label="Category Style"
      name="categoryStyle"
      control={control}
      isSelect
      selectOptions={Object.entries(CATEGORY_STYLES).map(([label, value]) => ({
        label,
        value,
      }))}
    />
  );
}
