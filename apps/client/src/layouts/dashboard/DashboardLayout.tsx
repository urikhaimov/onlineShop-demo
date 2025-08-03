import * as React from 'react';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import SideMenu from './components/SideMenu';
import AppTheme from '../shared-theme/AppTheme';
import { Outlet } from 'react-router-dom';
import theme from '@client/layouts/dashboard/theme';
import { useMediaQuery } from '@mui/material';

const xThemeComponents = {};

export default function Dashboard(props) {
  const medium = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />

      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
        }}
      >
        {/* Side Drawer and Top Bar */}
        <SideMenu />
        <AppNavbar />

        {/* Main Content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            display: 'flex',
            flexDirection: 'column',
          })}
        >
          {/* Scrollable content with sticky Header */}
          <Box
            sx={{
              flexShrink: 0,
              zIndex: 1,
              position: 'sticky',
              top: 0,
              backgroundColor: 'background.paper',
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Header />
          </Box>

          {/* Scrollable Outlet */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              px: 0,
              py: 0,
              width: '100%',
              pt: medium ? 8 : 0, // 👈 Add padding-top to offset sticky Header
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
    </AppTheme>
  );
}
