// src/components/RankChip.tsx
import * as React from 'react';
import { Chip } from '@mui/material';

type Props = { rank: number };

export function RankChip({ rank }: Props) {
  // color tiers for fun (1–3 highlighted)
  const color: 'default' | 'primary' | 'success' | 'warning' =
    rank === 1
      ? 'success'
      : rank === 2
        ? 'primary'
        : rank === 3
          ? 'warning'
          : 'default';

  return (
    <Chip
      size="small"
      label={`#${rank}`}
      color={color}
      variant={rank <= 3 ? 'filled' : 'outlined'}
    />
  );
}
