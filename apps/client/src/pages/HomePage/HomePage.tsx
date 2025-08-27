// src/pages/home/HomePage.tsx
import React from 'react';
import { Alert, Box, CircularProgress, Container } from '@mui/material';
import {
  HOMEPAGE_LAYOUTS,
  type HomepageLayout,
  type LandingPageData,
} from '@common/types';
import { headerHeight, footerHeight } from '../../config/themeConfig';
import { useLandingPage } from '../../hooks/useLandingPage';
import LandingLayoutRenderer from '../../components/landing/LandingLayoutRenderer';

export default function HomePage() {
  const { data, isLoading, error } = useLandingPage();

  if (isLoading) return null;
  if (error || !data) return null;

  // This must be the *raw* server object:

  return <LandingLayoutRenderer data={data} />;
}
