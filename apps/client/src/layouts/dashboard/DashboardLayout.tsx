// src/layouts/dashboard/Dashboard.tsx
import * as React from 'react';
import { CssBaseline, Box, useTheme, useMediaQuery } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';

import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import SideMenu from './components/SideMenu';
import CartDrawer from '../../components/CartDrawer';
import { useSidebarStore } from '../../stores/useSidebarStore';

// No AppTheme wrapper here — your app is already wrapped by CssVarsProvider at the root.

export default function Dashboard(): React.JSX.Element {
  const theme = useTheme();
  const medium = useMediaQuery(theme.breakpoints.down('md'));

  const cartOpen = useSidebarStore((s) => s.cartOpen);
  const closeCartDrawer = useSidebarStore((s) => s.closeCartDrawer);

  // Theme-aware scrollbar colors
  const thumbColor =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.24)
      : alpha(theme.palette.common.black, 0.24);

  const trackColor =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.06)
      : alpha(theme.palette.common.black, 0.06);

  return (
    <>
      <CssBaseline enableColorScheme />
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
          bgcolor: 'background.default', // follows light/dark automatically
        }}
      >
        {/* Side Drawer and Top Bar */}
        <SideMenu />
        <AppNavbar />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'hidden',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Sticky header */}
          <Box
            sx={{
              flexShrink: 0,
              zIndex: 1,
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Header />
          </Box>

          {/* Scrollable outlet */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              px: 0,
              py: 0,
              width: '100%',
              pt: medium ? 8 : 0, // offset for sticky header on small screens
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: thumbColor,
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: trackColor,
              },
            }}
          >
            <Outlet />
          </Box>
        </Box>

        <CartDrawer open={cartOpen} onClose={closeCartDrawer} />
      </Box>
    </>
  );
}
