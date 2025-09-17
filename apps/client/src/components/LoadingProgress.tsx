import * as React from 'react';
import { Box } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

type Props = {
  size?: number;
  /** Visible name for AT; default keeps tests happy */
  label?: string;
};

export default function LoadingProgress({
  size = 60,
  label = 'Loading',
}: Props) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight={120}
    >
      <CircularProgress aria-label={label} size={size} />
    </Box>
  );
}
