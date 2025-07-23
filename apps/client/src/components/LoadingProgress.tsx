// src/components/LoadingProgress.tsx
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import {} from '../config/themeConfig';
import {
  headerHeight,
  footerHeight,
  sidebarWidth,
} from '../config/themeConfig';
const LoadingProgress = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: `calc(100vh - ${headerHeight + footerHeight}px)`,
        overflowX: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default LoadingProgress;
