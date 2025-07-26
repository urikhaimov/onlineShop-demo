// src/context/ThemeContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import {
  createTheme,
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { useStoreTheme } from '../hooks/useStoreTheme';
import { ThemeSettings } from '../api/theme';

export interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  isLoading: boolean;
  error: any;
  theme: Theme; // MUI theme
  themeSettings: ThemeSettings; // ✅ Include raw settings
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data, isLoading, error } = useStoreTheme();
  const mode = data?.darkMode ? 'dark' : 'light';

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode,
        primary: { main: data?.primaryColor || '#1976d2' },
        secondary: { main: data?.secondaryColor || '#f50057' },
      },
      typography: {
        fontFamily: data?.font || 'Roboto',
      },
      shape: {
        borderRadius: data?.borderRadius ?? 8,
      },
      spacing: data?.spacingScale ?? 8,
    });
  }, [data, mode]);

  const toggleMode = () => {
    console.warn('toggleMode not implemented in static theme');
  };

  if (!data && !isLoading) {
    return <div>Error loading theme</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        toggleMode,
        isLoading,
        error: error?.message || null,
        themeSettings: data,
      }}
    >
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
