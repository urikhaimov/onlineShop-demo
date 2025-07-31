// apps/client-ui/src/components/layout/StickyFilterBar.tsx

import React, { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  Button,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CloseIcon from '@mui/icons-material/Close';

interface StickyFilterBarProps {
  children: React.ReactNode;
  topOffset?: number;
  zIndex?: number;
  title?: string;
}

export default function StickyFilterBar({
  children,
  topOffset = 64,
  zIndex,
  title = 'Filters',
}: StickyFilterBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile); // default: open on desktop, closed on mobile

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: topOffset,
        zIndex: zIndex ?? theme.zIndex.appBar,
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 2, sm: 3 },
        py: 1.5,
      }}
    >
      {/* Top bar with toggle on mobile */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={isMobile && open ? 1.5 : 0}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>

        {isMobile && (
          <Button
            onClick={toggleOpen}
            size="small"
            startIcon={open ? <CloseIcon /> : <FilterAltIcon />}
          >
            {open ? 'Hide' : 'Show'} Filters
          </Button>
        )}
      </Box>

      {/* Collapsible filter section */}
      <Collapse in={open}>
        <Divider sx={{ mb: 2 }} />
        {children}
      </Collapse>
    </Box>
  );
}
