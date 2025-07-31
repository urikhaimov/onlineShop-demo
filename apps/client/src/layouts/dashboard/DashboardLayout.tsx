// apps/client-ui/layouts/dashboard/DashboardLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Toolbar,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import AppBarContent from './AppBarContent';
import DrawerContent from './DrawerContent';
import theme from './theme';

const drawerWidth = 240;

export default function DashboardLayout() {
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />
        <AppBarContent />
        <DrawerContent />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            ml: `${drawerWidth}px`,
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
          }}
        >
          {/* Pushes content below AppBar */}
          <Toolbar />

          {/* Growable outlet area */}
          <Box
            sx={{
              flexGrow: 1,
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
