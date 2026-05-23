import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AnimatePresence } from 'framer-motion';
import { SnackbarProvider } from 'notistack';

import { useThemeStore } from './stores/useThemeStore';
import { getThemeFromSettings } from './utils/themeBuilder';
import { appRoutes } from './config/routesConfig';
import { handleGoogleRedirectResultOnce } from './auth/auth-google';
import GlobalBackground from './components/background/GlobalBackground';
import LoadingProgress from './components/LoadingProgress';
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

  useEffect(() => {
    handleGoogleRedirectResultOnce().catch(console.error);
  }, []);
  const routes = appRoutes(location);

  return (
    <MuiThemeProvider theme={theme}>
      <SnackbarProvider
        maxSnack={3}
        preventDuplicate
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <CssBaseline />
        <GlobalBackground />
        <React.Suspense fallback={<LoadingProgress />}>
          <AnimatePresence mode="wait">{routes}</AnimatePresence>
        </React.Suspense>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
}
