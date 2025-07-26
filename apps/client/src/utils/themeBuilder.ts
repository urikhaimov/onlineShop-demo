import type { ThemeOptions, PaletteMode } from '@mui/material';

export function getThemeFromSettings(settings: unknown): ThemeOptions {
  const mode: PaletteMode = settings?.darkMode ? 'dark' : 'light';
  const font = settings?.font || 'Roboto';
  const fontWeights = '400;500;700'; // preload these weights

  // Dynamically load Google Font
  const linkId = 'dynamic-font-link';
  const fontName = font.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@${fontWeights}&display=swap`;

  if (typeof document !== 'undefined' && !document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  return {
    palette: {
      mode,
      primary: {
        main: settings?.primaryColor || '#1976d2',
      },
      secondary: {
        main: settings?.secondaryColor || '#dc004e',
      },
      ...(settings?.backgroundColor && {
        background: {
          default: settings.backgroundColor,
        },
      }),
      ...(settings?.textColor && {
        text: {
          primary: settings.textColor,
        },
      }),
    },
    typography: {
      fontFamily: font,
    },
    shape: {
      borderRadius: 12,
    },
  };
}
