// MUI v5-compatible (works on v6 too with same imports)
// If you're on v6, you can import { extendTheme, CssVarsProvider } instead.
import {
  experimental_extendTheme as extendTheme,
  type PaletteOptions,
} from '@mui/material/styles';

import type { ThemeSettings } from '../api/theme';

function buildPalette(
  settings: ThemeSettings,
  mode: 'light' | 'dark',
): PaletteOptions {
  const primary = settings.primaryColor || '#1976d2';
  const secondary = settings.secondaryColor || '#ff4081';

  return {
    mode,
    primary: { main: primary },
    secondary: { main: secondary },
    ...(mode === 'dark'
      ? {
          background: {
            default: '#0b0f19',
            paper: '#121826',
          },
        }
      : {
          background: {
            default: '#fafafa',
            paper: '#fff',
          },
        }),
  };
}

export function getMuiTheme(settings: ThemeSettings) {
  const radius = settings.borderRadius ?? 8;
  const spacingScale = settings.spacingScale ?? 1;

  return extendTheme({
    cssVarPrefix: 'app', // to avoid collisions
    colorSchemes: {
      light: {
        palette: buildPalette(settings, 'light'),
      },
      dark: {
        palette: buildPalette(settings, 'dark'),
      },
    },
    shape: {
      borderRadius: radius,
    },
    typography: {
      fontFamily:
        settings.fontFamily ||
        'Roboto, system-ui, -apple-system, Segoe UI, Arial',
      fontSize: settings.fontSize ?? 16,
      fontWeightRegular: settings.fontWeight ?? 400,
    },
    spacing: (factor: number) => 8 * spacingScale * factor,
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: radius },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: radius },
        },
      },
    },
  });
}
