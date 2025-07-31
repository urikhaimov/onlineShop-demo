// apps/client-ui/layouts/dashboard/AppBarContent.tsx

import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export default function AppBarContent() {
  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar>
        <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap>
          E-Commerce
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
