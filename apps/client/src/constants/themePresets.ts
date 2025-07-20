import { ThemeSettings } from '../api/theme';

export const themePresets: Record<string, ThemeSettings> = {
  light: {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    darkMode: false,
    fontFamily: 'Roboto',
    maxWidth: 'lg',
    borderRadius: 8,
    spacingScale: 8,
  },
  dark: {
    primaryColor: '#90caf9',
    secondaryColor: '#f48fb1',
    darkMode: true,
    fontFamily: 'Open Sans',
    maxWidth: 'lg',
    borderRadius: 8,
    spacingScale: 8,
  },
  business: {
    primaryColor: '#0d47a1',
    secondaryColor: '#ff6f00',
    darkMode: false,
    fontFamily: 'Inter',
    maxWidth: 'xl',
    borderRadius: 6,
    spacingScale: 10,
  },
  gaming: {
    primaryColor: '#ff1744',
    secondaryColor: '#651fff',
    darkMode: true,
    fontFamily: 'Orbitron',
    maxWidth: 'full',
    borderRadius: 12,
    spacingScale: 14,
  },
};
