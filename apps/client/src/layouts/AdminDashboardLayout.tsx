// src/layouts/AdminDashboardLayout.tsx
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

export default function AdminDashboardLayout() {
  return (
    <Box
      sx={{
        width: '100%',
        mx: 'auto',
      }}
    >
      <Outlet />
    </Box>
  );
}
