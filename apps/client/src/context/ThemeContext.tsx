// src/context/ThemeContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, Theme } from '@mui/material';
import { useStoreTheme } from '../hooks/useStoreTheme';

type ThemeContextType = {
  theme: Theme;
  mode: 'light' | 'dark';
  toggleMode: () => void;
  isLoading: boolean;
  error: string | null;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({
  children,
  storeId = 'store1',
}: {
  children: React.ReactNode;
  storeId?: string;
}) => {
  const { data, isLoading, error } = useStoreTheme(storeId);
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
    console.warn('toggleMode not implemented for static theme');
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleMode, isLoading, error: error?.message || null }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within a ThemeProvider');
  return context;
};
