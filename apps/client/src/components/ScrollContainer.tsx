// src/components/ScrollContainer.tsx
import { Box } from '@mui/material';
import { styled } from '@mui/system';
import React from 'react';

const ScrollContainer: React.ComponentType<any> = styled(Box)(({ theme }) => ({
  overflowY: 'auto',
  overflowX: 'hidden',
  maxHeight: '100vh',
  scrollbarWidth: 'thin',
  scrollbarColor: '#888 #2c2c2c',

  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#2c2c2c',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#888',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: '#aaa',
  },
}));

export default ScrollContainer;
