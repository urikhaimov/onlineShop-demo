// src/components/LoadingProgress.tsx
import * as React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

type Props = { label?: string };

export default function LoadingProgress({ label = 'Loading' }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'grid', placeItems: 'center', py: 4 }}
    >
      {/* MUI already sets role="progressbar"; we add a name */}
      <CircularProgress aria-label={label} size={60} />
      <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
        {label}…
      </Typography>
    </Box>
  );
}
