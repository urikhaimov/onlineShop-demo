import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Toolbar,
  useMediaQuery,
  useTheme,
  ThemeProvider,
} from '@mui/material';
import AppBarContent from './AppBarContent';
import DrawerContent from './DrawerContent';
import theme from './theme';

export default function DashboardLayout() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <CssBaseline />

        {/* AppBar + Drawer */}
        <AppBarContent onMenuClick={handleDrawerToggle} />
        <DrawerContent
          mobileOpen={mobileOpen}
          onClose={handleDrawerToggle}
          isMobile={isMobile}
        />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
          }}
        >
          {/* Spacer below AppBar */}
          <Toolbar />

          {/* Scrollable Content */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              height: '100%',
              width: '100%',
              p: { xs: 2, sm: 3 },
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
