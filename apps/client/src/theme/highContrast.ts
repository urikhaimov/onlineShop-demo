// src/theme/highContrast.ts
import { alpha, createTheme, darken } from '@mui/material/styles';

export const highContrastTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#fdfdfd', paper: '#fff' },
    // keep your brand as main, but use a darker shade for text-on-color & links
    primary: {
      main: '#7aafe3', // your brand
      dark: '#1565c0', // AA-safe on white AND with white text
      contrastText: '#fff', // will be used on primary.dark
    },
    text: {
      primary: '#111111', // ~ 15:1 on white
      secondary: '#4d4d4d', // ~ 7:1 on white
    },
    divider: alpha('#000', 0.12),
  },
  components: {
    // Headings & body copy must use primary text
    MuiTypography: {
      styleOverrides: {
        h6: ({ theme }) => ({ color: theme.palette.text.primary }),
        body2: ({ theme }) => ({ color: theme.palette.text.primary }),
      },
    },
    // Input labels should not be light grey
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({ color: theme.palette.text.secondary }),
      },
    },
    // Use the darker brand for contained/outlined + ensure AA contrast
    MuiButton: {
      styleOverrides: {
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.primary.dark,
          color: theme.palette.getContrastText(theme.palette.primary.dark), // white on #1565c0 passes AA
          '&:hover': {
            backgroundColor: darken(theme.palette.primary.dark, 0.1),
          },
        }),
        outlinedPrimary: ({ theme }) => ({
          color: theme.palette.primary.dark, // #1565c0 on white passes AA
          borderColor: alpha(theme.palette.primary.dark, 0.5),
          '&:hover': {
            borderColor: theme.palette.primary.dark,
            backgroundColor: alpha(theme.palette.primary.dark, 0.04),
          },
        }),
      },
    },
    // Links like “Forgot password?”
    MuiLink: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.dark, // AA on white
          textDecorationColor: alpha(theme.palette.primary.dark, 0.6),
          '&:hover': { textDecorationColor: theme.palette.primary.dark },
        }),
      },
    },
    // Divider “or”
    MuiDivider: {
      styleOverrides: {
        wrapper: ({ theme }) => ({ color: theme.palette.text.secondary }),
      },
    },
  },
});
