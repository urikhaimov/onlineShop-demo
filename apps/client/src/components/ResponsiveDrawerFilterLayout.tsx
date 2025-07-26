import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

interface Props {
  children: React.ReactNode;
  hasFilters?: boolean;
  onClear?: () => void;
  actions?: React.ReactNode;
}

export default function ResponsiveDrawerWrapper({
  children,
  hasFilters,
  onClear,
  actions,
}: Props) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleDrawer = () => setOpen((prev) => !prev);

  if (isMobile) {
    return (
      <>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <IconButton onClick={toggleDrawer}>
            <FilterAltIcon />
          </IconButton>
          {hasFilters && (
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', color: 'text.secondary' }}
            >
              Filters are active.
            </Typography>
          )}
          {onClear && (
            <Button onClick={onClear} size="small" color="secondary">
              Clear
            </Button>
          )}
        </Box>

        <Drawer
          anchor="left"
          open={open}
          onClose={toggleDrawer}
          slotProps={{
            paper: {
              sx: {
                width: 300,
                zIndex: theme.zIndex.drawer + 5,
                p: 2,
              },
            },
          }}
        >
          <Typography variant="h6" mb={2}>
            Filters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {children}
        </Drawer>
      </>
    );
  }

  return (
    <Box mb={3}>
      {actions && (
        <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
          {actions}
        </Box>
      )}

      {hasFilters && (
        <Typography
          variant="body2"
          sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}
        >
          Filters are active.
        </Typography>
      )}

      <Divider sx={{ mb: 2 }} />

      <Box>{children}</Box>
    </Box>
  );
}
