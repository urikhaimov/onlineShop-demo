import React from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AnimatePresence } from 'framer-motion';

import { useThemeStore } from './stores/useThemeStore';
import { getThemeFromSettings } from './utils/themeBuilder';
import { appRoutes } from './config/routesConfig';

import './App.css';

export default function App() {
  const location = useLocation();

  const { themeSettings } = useThemeStore();
  const theme = createTheme(getThemeFromSettings(themeSettings));

  // const isAuthPage =
  //   location.pathname.startsWith('/login') ||
  //   location.pathname.startsWith('/signup') ||
  //   location.pathname.startsWith('/reset-password');

  const routes = appRoutes(location);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AnimatePresence mode="wait">{routes}</AnimatePresence>
    </MuiThemeProvider>
  );
}
