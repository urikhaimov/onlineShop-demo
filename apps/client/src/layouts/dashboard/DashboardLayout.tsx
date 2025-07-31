import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Toolbar,
  createTheme,
  ThemeProvider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppBarContent from './AppBarContent';
import DrawerContent from './DrawerContent';
import theme from './theme';

const drawerWidth = 240;

export default function DashboardLayout() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />
        <AppBarContent onMenuClick={handleDrawerToggle} />
        <DrawerContent
          mobileOpen={mobileOpen}
          onClose={handleDrawerToggle}
          isMobile={isMobile}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            ml: isMobile ? 0 : `${drawerWidth}px`,
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
          }}
        >
          <Toolbar />
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
