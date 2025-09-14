import * as React from 'react';
import { Box, Button, Stack, Typography, SxProps, Theme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

type Props = {
  title: string;
  onReset?: () => void;
  /** Optional custom actions to show on the right (e.g., Export CSV button) */
  rightActions?: React.ReactNode;
  /** Optional extra content to the left of the title (chips, counters) */
  leftActions?: React.ReactNode;
  sx?: SxProps<Theme>;
};

const BUTTON_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
};

export default function AdminHeaderBar({
  title,
  onReset,
  rightActions,
  leftActions,
  sx,
}: Props) {
  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{title}</Typography>
          {leftActions}
        </Stack>

        <Stack direction="row" spacing={1}>
          {onReset && (
            <Button
              variant="outlined"
              size="small"
              onClick={onReset}
              startIcon={<RestartAltIcon />}
              sx={BUTTON_SX}
            >
              Reset
            </Button>
          )}
          {rightActions}
        </Stack>
      </Stack>
    </Box>
  );
}
