import * as React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

type Props = {
  children: React.ReactNode;
  gap?: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps<Theme>;
};

export default function ResponsiveCardsGrid({
  children,
  gap = 2,
  columns = { xs: 1, sm: 1, md: 2, lg: 3 },
  sx,
}: Props) {
  return (
    <Box
      display="grid"
      alignItems="stretch"
      gap={gap}
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'clip',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
          md: `repeat(${columns.md ?? 3}, minmax(0, 1fr))`,
          lg: `repeat(${columns.lg ?? 4}, minmax(0, 1fr))`,
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
