import '@mui/material/styles';
import { ThemeSettings } from '../api/theme';

declare module '@mui/material/styles' {
  interface Theme extends ThemeSettings {}
  interface ThemeOptions extends Partial<ThemeSettings> {}
}
