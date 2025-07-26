// ✅ ToggleOptions.tsx
import React from 'react';
import { Controller } from 'react-hook-form';
import { FormControlLabel, Switch, Stack } from '@mui/material';

interface Props {
  control: unknown;
}

export default function ToggleOptions({ control }: Props) {
  return (
    <Stack spacing={2}>
      <Controller
        name="showSidebar"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} />}
            label="Show Sidebar"
          />
        )}
      />

      <Controller
        name="stickyHeader"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch {...field} checked={field.value} />}
            label="Sticky Header"
          />
        )}
      />
    </Stack>
  );
}
