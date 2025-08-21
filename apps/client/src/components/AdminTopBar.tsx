import * as React from 'react';
import { Stack, Button, SxProps, Theme } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

type Props = {
  onOpenFilters: () => void;
  onResetFilters: () => void;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
  leftSx?: SxProps<Theme>;
};

const BUTTON_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
  minWidth: 120,
};

export default function AdminTopBar({
  onOpenFilters,
  onResetFilters,
  size = 'small',
  sx,
  leftSx,
}: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      flexWrap="wrap"
      sx={{ minWidth: 0, ...sx }}
    >
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        sx={{ flexShrink: 0, ...leftSx }}
      >
        <Button
          variant="outlined"
          size={size}
          onClick={onOpenFilters}
          startIcon={<FilterListIcon />}
          sx={BUTTON_SX}
        >
          Filters
        </Button>
        <Button
          variant="outlined"
          size={size}
          onClick={onResetFilters}
          startIcon={<RestartAltIcon />}
          sx={BUTTON_SX}
        >
          Reset filters
        </Button>
      </Stack>
      {/* right side intentionally empty (no view toggle for admin) */}
      <span />
    </Stack>
  );
}
