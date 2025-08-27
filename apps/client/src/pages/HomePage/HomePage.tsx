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
// If you use react-helmet-async, uncomment:
// import { Helmet } from 'react-helmet-async';

const isLayout = (v: unknown): v is HomepageLayout =>
  (Object.values(HOMEPAGE_LAYOUTS) as string[]).includes(v as string);

function normalizeLanding(raw?: Partial<LandingPageData>): LandingPageData {
  return {
    title: raw?.title ?? 'Welcome',
    subtitle: raw?.subtitle ?? '',
    bannerImageUrl: raw?.bannerImageUrl ?? '',
    ctaButtonText: raw?.ctaButtonText ?? '',
    ctaButtonLink: raw?.ctaButtonLink ?? '/products',
    homepageLayout: isLayout(raw?.homepageLayout)
      ? raw!.homepageLayout
      : HOMEPAGE_LAYOUTS.Hero,
    sections: Array.isArray(raw?.sections) ? raw!.sections : [],
  };
}

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useLandingPage();

  // Loading
  if (isLoading) {
    return (
      <Box
        sx={{
          mt: `${headerHeight}px`,
          minHeight: `calc(100vh - ${headerHeight + footerHeight}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error
  if (isError || !data) {
    return (
      <Container sx={{ mt: `${headerHeight}px`, mb: `${footerHeight}px` }}>
        <Alert
          severity="error"
          action={
            <Box
              component="button"
              onClick={() => refetch()}
              style={{
                all: 'unset',
                cursor: 'pointer',
                color: 'inherit',
                fontWeight: 600,
              }}
            >
              Retry
            </Box>
          }
        >
          Failed to load landing page.
        </Alert>
      </Container>
    );
  }

  const landing = normalizeLanding(data);

  return (
    <>
      {/* Optional SEO
      <Helmet>
        <title>{landing.title}</title>
        {landing.subtitle && <meta name="description" content={landing.subtitle} />}
        {landing.bannerImageUrl && <meta property="og:image" content={landing.bannerImageUrl} />}
      </Helmet>
      */}
      <Box sx={{ mt: `${headerHeight}px`, mb: `${footerHeight}px` }}>
        <LandingLayoutRenderer data={landing} />
      </Box>
    </>
  );
}
