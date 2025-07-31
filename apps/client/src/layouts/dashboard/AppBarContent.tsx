// apps/client-ui/layouts/dashboard/AppBarContent.tsx

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

interface Props {
  onMenuClick: () => void;
}

export default function AppBarContent({ onMenuClick }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Wrapper Box ensures left spacing even when menu button is absent */}
        <Box sx={{ ml: isMobile ? 0 : 2 }}>
          <Typography variant="h6" noWrap component="div">
            E-Commerce
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
