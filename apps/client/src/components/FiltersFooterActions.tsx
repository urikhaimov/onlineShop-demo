import * as React from 'react';
import { Box, Button, SxProps, Theme } from '@mui/material';

type Props = {
  onReset: () => void;
  onApply?: () => void; // optional
  showApply?: boolean; // control visibility (e.g., isMobile)
  size?: 'small' | 'medium' | 'large';
  /** same min width for both buttons */
  minButtonWidth?: number; // default 120
  /** spacing on top; and custom sx for wrapper */
  sx?: SxProps<Theme>;
  /** labels (i18n friendly) */
  resetLabel?: string; // default 'Reset Filters'
  applyLabel?: string; // default 'Apply'
};

const BTN_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
};

export default function FiltersFooterActions({
  onReset,
  onApply,
  showApply = true,
  size = 'small',
  minButtonWidth = 120,
  sx,
  resetLabel = 'Reset Filters',
  applyLabel = 'Apply',
}: Props) {
  return (
    <Box display="flex" justifyContent="space-between" sx={{ pt: 0.5, ...sx }}>
      <Button
        onClick={onReset}
        variant="outlined"
        color="secondary"
        size={size}
        sx={{ ...BTN_SX, minWidth: minButtonWidth }}
      >
        {resetLabel}
      </Button>

      {showApply && (
        <Button
          onClick={onApply}
          variant="outlined" // ← same look as Reset
          color="primary" // same style, different color
          size={size}
          sx={{ ...BTN_SX, minWidth: minButtonWidth }}
        >
          {applyLabel}
        </Button>
      )}
    </Box>
  );
}
