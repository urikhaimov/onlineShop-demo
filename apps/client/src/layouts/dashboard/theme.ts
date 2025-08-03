// apps/client-ui/layouts/dashboard/theme.ts

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Blue
    },
    secondary: {
      main: '#9c27b0', // Purple
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
  },
});

export default theme;
