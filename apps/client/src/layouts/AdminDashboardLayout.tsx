// src/layouts/AdminDashboardLayout.tsx
import { Box } from '@mui/material';

import { Outlet } from 'react-router-dom';

export default function AdminDashboardLayout() {
  return (
    <>
      <Box
        sx={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          mx: 'auto',
        }}
      >
        {<Outlet />}
      </Box>
    </>
  );
}
