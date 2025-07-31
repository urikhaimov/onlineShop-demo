import { Box, Typography } from '@mui/material';
import { drawerWidth } from '../constants/globalConstants';

const TestPage = () => {
  return (
    <Box
      sx={{
        width: `calc(100vw - ${drawerWidth}px)`,
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
