import React, { useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Box,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';

import { useThemeStore } from '../stores/useThemeStore';
import { getThemeFromSettings } from '../utils/themeBuilder';

type Props = {
  children: React.ReactNode;
};

export function StoreBoundThemeProvider({ children }: Props) {
  const { themeSettings, isLoading, error, loadTheme } = useThemeStore();

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const muiTheme = createTheme(getThemeFromSettings(themeSettings));

  if (isLoading) {
    return (
      <Box
        height="100vh"
        width="100vw"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="#fff"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        height="100vh"
        width="100vw"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        textAlign="center"
        bgcolor="#fff"
        color="error.main"
      >
        <div>
          <h2>🚨 Failed to load theme</h2>
          <p>{error}</p>
        </div>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
