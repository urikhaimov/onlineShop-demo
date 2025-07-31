import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { drawerWidth } from '../constants/globalConstants';

const TestPage = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  return (
    <Box
      sx={{
        width: isMobile ? '100vw' : `calc(100vw - ${drawerWidth}px)`,
        height: '2000px', // simulate long scroll
        backgroundColor: '#f0f0f0',
        p: 3,
      }}
    >
      <Typography variant="h4">Test Page — Full Width ✅</Typography>
    </Box>
  );
};

export default TestPage;
