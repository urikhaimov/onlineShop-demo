// src/components/theme/StoreNameField.tsx
import React from 'react';
import { Box, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

interface Props {
  control: any;
}

export default function StoreNameField({ control }: Props) {
  return (
    <Box>
      <Controller
        name="storeName"
        control={control}
        render={({ field }) => (
          <TextField label="Store Name" fullWidth variant="outlined" {...field} />
        )}
      />
    </Box>
  );
}
