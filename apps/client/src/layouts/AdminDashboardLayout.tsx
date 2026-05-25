// src/layouts/AdminDashboardLayout.tsx
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { DemoModeBadge } from '../components/DemoModeBadge';

export default function AdminDashboardLayout() {
  return (
    <>
      {/* Visible only when VITE_DEMO_ADMIN=true on localhost */}
      <DemoModeBadge />
      <Box
        sx={{
          width: '100%',
          mx: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </>
  );
}
