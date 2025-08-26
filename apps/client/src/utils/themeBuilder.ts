import { extendTheme, type PaletteOptions } from '@mui/material/styles';
import type { ThemeSettings } from '../api/theme';

export type AppTheme = ReturnType<typeof extendTheme>;

function makePalette(s: ThemeSettings, mode: 'light' | 'dark'): PaletteOptions {
  const primary = s.primaryColor || '#1976d2';
  const secondary = s.secondaryColor || '#ff4081';
  const p: PaletteOptions = {
    mode,
    primary: { main: primary },
    secondary: { main: secondary },
  };
  p.background =
    mode === 'light'
      ? { default: '#fafafa', paper: '#ffffff' }
      : { default: '#0b0f19', paper: '#121826' };
  return p;
}

export function getThemeFromSettings(s: ThemeSettings): AppTheme {
  const radius = s.borderRadius ?? 12;
  const spacingScale = s.spacingScale ?? 1;
  const fontFamily = (s as any).fontFamily || (s as any).font || 'Roboto';
  const fontSize = s.fontSize ?? 16;
  const fontWeight = s.fontWeight ?? 400;

  return extendTheme({
    cssVarPrefix: 'app',
    // 👇 ensures manual toggling works; must match provider attribute
    colorSchemeSelector: '[data-mui-color-scheme="%s"]',
    colorSchemes: {
      light: { palette: makePalette(s, 'light') },
      dark: { palette: makePalette(s, 'dark') },
    },
    shape: { borderRadius: radius },
    spacing: (f: number) => 8 * spacingScale * f,
    typography: { fontFamily, fontSize, fontWeightRegular: fontWeight },
    components: {
      MuiCard: { styleOverrides: { root: { borderRadius: radius } } },
      MuiButton: { styleOverrides: { root: { borderRadius: radius } } },
    },
  });
}
