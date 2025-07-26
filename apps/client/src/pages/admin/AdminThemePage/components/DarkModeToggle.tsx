// src/components/theme/DarkModeToggle.tsx
import React from 'react';
import { Box, FormControlLabel, Switch } from '@mui/material';
import { Controller } from 'react-hook-form';

interface Props {
  control: unknown;
}

export default function DarkModeToggle({ control }: Props) {
  return (
    <Box>
      <Controller
        name="darkMode"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} />}
            label="Enable Dark Mode"
          />
        )}
      />
    </Box>
  );
}
