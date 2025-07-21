import React from 'react';
import { Box, Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

interface Props {
  control: any;
}

export default function ColorPickerSection({ control }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Box flex={1}>
        <Controller
          name="primaryColor"
          control={control}
          render={({ field }) => (
            <TextField
              label="Primary Color"
              type="color"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              {...field}
            />
          )}
        />
      </Box>

      <Box flex={1}>
        <Controller
          name="secondaryColor"
          control={control}
          render={({ field }) => (
            <TextField
              label="Secondary Color"
              type="color"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              {...field}
            />
          )}
        />
      </Box>
    </Stack>
  );
}
