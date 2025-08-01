import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Drawer,
  Button,
  Stack,
} from '@mui/material';
import React from 'react';
import { headerHeight, footerHeight } from '../config/themeConfig';

interface Props {
  title?: string | React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
  showReset?: boolean;
  onReset?: () => void;
  hasFilters?: boolean;
}

export default function PageWithStickyFilters({
  title,
  sidebar,
  children,
  mobileOpen = false,
  onMobileClose,
  onMobileOpen,
  onReset,
  hasFilters,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        width: '100%',
        height: '2000px', // simulate long scroll
        backgroundColor: '#f0f0f0',
        p: 3,
      }}
    >
      {/* Top Row */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        {typeof title === 'string' ? (
          <Typography variant="h6">{title}</Typography>
        ) : (
          title
        )}

        {/* Actions */}
        <Stack direction="row" spacing={1}>
          {onMobileOpen && onMobileClose && isMobile && (
            <Button
              variant="outlined"
              size="small"
              onClick={mobileOpen ? onMobileClose : onMobileOpen}
              sx={{ textTransform: 'none' }}
            >
              {mobileOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
          )}
          {onReset && hasFilters && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={onReset}
              sx={{ textTransform: 'none' }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>
      </Box>

      {/* Main Content Layout */}
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        gap={2}
        flex={1}
        minHeight={0}
        overflow="hidden"
      >
        {children}
      </Box>
    </Box>
  );
}
