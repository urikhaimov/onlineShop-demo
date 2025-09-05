import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AnimatePresence } from 'framer-motion';

import { useThemeStore } from './stores/useThemeStore';
import { getThemeFromSettings } from './utils/themeBuilder';
import { appRoutes } from './config/routesConfig';

import GlobalBackground from './components/background/GlobalBackground';
import './App.css';

export default function App() {
  const location = useLocation();
  const { themeSettings } = useThemeStore();
  const theme = createTheme(getThemeFromSettings(themeSettings));

  // Keep html[data-color-scheme] in sync for background CSS variants
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-color-scheme',
      theme.palette.mode,
    );
  }, [theme.palette.mode]);

  const routes = appRoutes(location);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalBackground /> {/* ← renders once, behind everything */}
      <AnimatePresence mode="wait">{routes}</AnimatePresence>
    </MuiThemeProvider>
  );
}
