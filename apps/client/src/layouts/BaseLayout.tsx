// src/layouts/BaseLayout.tsx
import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Header from '../components/Header/Header';
import Footer from '../components/Footer';
import ScrollContainer from '../components/ScrollContainer';
import LeftMenu from '../components/LeftMenu/LeftMenu';
import { footerHeight, sidebarWidth } from '../config/themeConfig';

interface BaseLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function BaseLayout({ children, showFooter = true }: BaseLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: theme.typography.fontFamily,
        bgcolor: theme.palette.background.default,
      }}
    >
      <Header />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isMobile ? (
          <LeftMenu />
        ) : (
          <ScrollContainer sx={{ width: sidebarWidth }}>
            <LeftMenu />
          </ScrollContainer>
        )}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
            px: theme.spacing(2),
            py: theme.spacing(2),
          }}
        >
          {children}
        </Box>
      </Box>
      {showFooter && !isMobile && (
        <Box sx={{ height: `${footerHeight}px`, flexShrink: 0 }}>
          <Footer />
        </Box>
      )}
    </Box>
  );
}
