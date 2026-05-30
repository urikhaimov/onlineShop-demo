// src/theme/getMuiTheme.ts
// MUI v5-compatible (works on v6/7 the same way)
// If you're on v6/7 you can import { extendTheme } (non-experimental).
import { extendTheme, type PaletteOptions } from '@mui/material/styles';
import type { ThemeSettings } from '../api/theme';

const DARK_BG = {
  default: '#0b0f19', // page background
  paper: '#121826', // surfaces
};

const LIGHT_BG = {
  default: '#f5f7fb', // slightly dimmer than #fafafa
  paper: '#ffffff',
};

function buildPalette(
  settings: ThemeSettings,
  mode: 'light' | 'dark',
): PaletteOptions {
  const primary = settings.primaryColor || '#1976d2';
  const secondary = settings.secondaryColor || '#ff4081';

  if (mode === 'dark') {
    return {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
      background: { default: DARK_BG.default, paper: DARK_BG.paper },
      text: {
        primary: 'rgba(255,255,255,0.92)',
        secondary: 'rgba(255,255,255,0.67)',
        disabled: 'rgba(255,255,255,0.38)',
      },
      divider: 'rgba(255,255,255,0.12)',
      action: {
        hover: 'rgba(255,255,255,0.06)',
        selected: 'rgba(255,255,255,0.10)',
        disabled: 'rgba(255,255,255,0.30)',
        disabledOpacity: 0.38,
        focus: 'rgba(255,255,255,0.12)',
        activatedOpacity: 0.12,
        hoverOpacity: 0.06,
      },
    };
  }

  // light
  return {
    mode,
    primary: { main: primary },
    secondary: { main: secondary },
    background: { default: LIGHT_BG.default, paper: LIGHT_BG.paper },
    text: {
      primary: 'rgba(0,0,0,0.87)',
      secondary: 'rgba(0,0,0,0.62)',
      disabled: 'rgba(0,0,0,0.38)',
    },
    divider: 'rgba(0,0,0,0.12)',
    action: {
      hover: 'rgba(0,0,0,0.04)',
      selected: 'rgba(0,0,0,0.08)',
      disabled: 'rgba(0,0,0,0.26)',
      disabledOpacity: 0.38,
      focus: 'rgba(0,0,0,0.12)',
      activatedOpacity: 0.12,
      hoverOpacity: 0.04,
    },
  };
}

export function getMuiTheme(settings: ThemeSettings) {
  const radius = settings.borderRadius ?? 8;
  const spacingScale = settings.spacingScale ?? 1;

  // Pick up HTML dir="rtl|ltr" so components know their direction
  const direction =
    (typeof document !== 'undefined' &&
      (document.documentElement.getAttribute('dir') as 'ltr' | 'rtl')) ||
    'ltr';

  return extendTheme({
    // keep your custom vars prefix; your GlobalStyles use --app-*
    cssVarPrefix: 'app',
    // REQUIRED so setMode('dark'|'light'|'system') works manually
    colorSchemeSelector: '[data-mui-color-scheme="%s"]',

    colorSchemes: {
      light: { palette: buildPalette(settings, 'light') },
      dark: { palette: buildPalette(settings, 'dark') },
    },

    direction,

    shape: { borderRadius: radius },

    typography: {
      fontFamily:
        settings.fontFamily ||
        'Noto Sans Hebrew, system-ui, -apple-system, "Segoe UI", Noto Sans Hebrew, sans-serif',
      fontSize: settings.fontSize ?? 16,
      fontWeightRegular: settings.fontWeight ?? 400,
    },

    spacing: (factor: number) => 8 * spacingScale * factor,

    // Make common surfaces follow background.paper & reduce whiteness
    components: {
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            backgroundColor: (theme.vars || theme).palette.background.paper,
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
            borderRadius: radius,
            // subtle outline for contrast in both modes
            border: `1px solid ${(theme.vars || theme).palette.divider}`,
          }),
        },
      },
      MuiAppBar: {
        defaultProps: { color: 'default', elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
            color: (theme.vars || theme).palette.text.primary,
            boxShadow: 'none',
          }),
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
            borderRight: `1px solid ${(theme.vars || theme).palette.divider}`,
          }),
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
            border: `1px solid ${(theme.vars || theme).palette.divider}`,
          }),
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
            border: `1px solid ${(theme.vars || theme).palette.divider}`,
          }),
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.background.paper,
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: (theme.vars || theme).palette.divider,
          }),
          head: ({ theme }) => ({
            // subtle head background for contrast in dark mode
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(0,0,0,0.02)',
          }),
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: (theme.vars || theme).palette.divider,
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:hover': {
              backgroundColor: (theme.vars || theme).palette.action.hover,
            },
            '&.Mui-selected': {
              backgroundColor: (theme.vars || theme).palette.action.selected,
              '&:hover': {
                backgroundColor: (theme.vars || theme).palette.action.selected,
              },
            },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: radius },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: (theme.vars || theme).palette.divider,
          }),
        },
      },
    },
  });
}
