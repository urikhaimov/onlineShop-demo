/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface */
import '@mui/material/styles';
import type { ThemeSettings } from '../api/theme';

declare module '@mui/material/styles' {
  interface Theme extends ThemeSettings {}
  interface ThemeOptions extends Partial<ThemeSettings> {}
}
