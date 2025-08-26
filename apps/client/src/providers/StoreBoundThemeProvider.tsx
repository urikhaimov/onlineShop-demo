// src/providers/StoreBoundThemeProvider.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  CssBaseline,
  CircularProgress,
  GlobalStyles,
} from '@mui/material';
import { CssVarsProvider, useColorScheme } from '@mui/material/styles';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { useThemeStore } from '../stores/useThemeStore';
import { getThemeFromSettings } from '../utils/themeBuilder';

function SyncModeOnHydrate() {
  const { setMode, mode, systemMode } = useColorScheme();
  const { themeSettings, isLoading } = useThemeStore();
  const hydrated = useRef(false);

  // Apply store value once on load
  useEffect(() => {
    if (isLoading || hydrated.current) return;
    setMode(themeSettings.darkMode ? 'dark' : 'light');
    hydrated.current = true;
  }, [isLoading, themeSettings.darkMode, setMode]);

  // Pragmatic safety: make sure body always picks up the current vars
  useEffect(() => {
    document.body.style.backgroundColor =
      'var(--mui-palette-background-default)';
    document.body.style.color = 'var(--mui-palette-text-primary)';
  }, [mode, systemMode]);

  return null;
}

export function StoreBoundThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeSettings, isLoading, error, loadTheme } = useThemeStore();

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);
  const theme = useMemo(
    () => getThemeFromSettings(themeSettings),
    [themeSettings],
  );

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
    <>
      <InitColorSchemeScript attribute="data-mui-color-scheme" />
      <CssVarsProvider
        theme={theme}
        defaultMode="system"
        attribute="data-mui-color-scheme" // must match your theme colorSchemeSelector
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        <GlobalStyles
          styles={{
            ':root, html': { height: '100%', width: '100%' },
            'html, body, #root': {
              height: '100%',
              minHeight: '100%',
              width: '100%',
              margin: 0,
              overflowX: 'hidden',
              backgroundColor:
                'var(--app-palette-background-default) !important',
              color: 'var(--app-palette-text-primary) !important',
            },

            /* Core surfaces */
            '.MuiPaper-root, .MuiCard-root, .MuiAppBar-root, .MuiToolbar-root, .MuiDrawer-paper':
              {
                backgroundColor:
                  'var(--app-palette-background-paper) !important',
                color: 'var(--app-palette-text-primary) !important',
              },

            /* Tables */
            '.MuiTableContainer-root, .MuiTable-root': {
              backgroundColor: 'var(--app-palette-background-paper) !important',
            },
            '.MuiTableCell-root': {
              borderColor: 'var(--app-palette-divider) !important',
            },

            /* Dividers, borders */
            '.MuiDivider-root': {
              borderColor: 'var(--app-palette-divider) !important',
            },
          }}
        />

        <SyncModeOnHydrate />
        {children}
      </CssVarsProvider>
    </>
  );
}
