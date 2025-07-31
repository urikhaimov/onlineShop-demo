import React from 'react';
import { Box, useTheme } from '@mui/material';

interface StickyFilterBarProps {
  children: React.ReactNode;
  topOffset?: number; // in px
  zIndex?: number;
}

export default function StickyFilterBar({
  children,
  topOffset = 64, // default AppBar height
  zIndex,
}: StickyFilterBarProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'sticky',
        top: topOffset,
        zIndex: zIndex ?? theme.zIndex.appBar,
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 2, sm: 3 },
        py: 2,
      }}
    >
      {children}
    </Box>
  );
}
