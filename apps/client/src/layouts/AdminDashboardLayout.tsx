// src/layouts/AdminDashboardLayout.tsx
import {
  Box,
 
} from '@mui/material';
import BaseLayout from './BaseLayout';
import { Outlet } from 'react-router-dom';

import { headerHeight, footerHeight, sidebarWidth } from '@client/config/themeConfig';
export default function AdminDashboardLayout() {
  return <>
    <Box
      sx={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >{<Outlet />}</Box>
    
    </>;
}
