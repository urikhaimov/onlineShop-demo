import * as React from 'react';
import { Box, Button, Stack, Typography, SxProps, Theme } from '@mui/material';

type Props = {
  title: string;
  onReset?: () => void;
  sx?: SxProps<Theme>;
};

const BUTTON_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
};

export default function AdminHeaderBar({ title, onReset, sx }: Props) {
  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">{title}</Typography>
        {onReset && (
          <Button
            size="small"
            variant="outlined"
            onClick={onReset}
            sx={BUTTON_SX}
          >
            Reset table state
          </Button>
        )}
      </Stack>
    </Box>
  );
}
