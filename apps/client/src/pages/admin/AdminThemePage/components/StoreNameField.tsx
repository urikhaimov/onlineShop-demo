import React from 'react';
import { Box } from '@mui/material';
import type { Control } from 'react-hook-form';
import FormTextField from '../../../../components/FormTextField';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  control: Control<ThemeSettings>;
}

export default function StoreNameField({ control }: Props) {
  return (
    <Box>
      <FormTextField
        label="Store Name"
        name="storeName"
        control={control}
        required
      />
    </Box>
  );
}
