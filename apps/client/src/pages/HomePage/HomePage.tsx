import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useLandingPage } from '../../hooks/useLandingPage';
import LoadingProgress from '../../components/LoadingProgress';
import BestSellers from '../../components/BestSellers';
import type { LandingPageData } from '../../types/landing';
import { useThemeStore } from '../../stores/useThemeStore';
import { HOMEPAGE_LAYOUTS, HomepageLayout } from '@common/types';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';

export default function HomePage() {
  const { themeSettings } = useThemeStore();
  const layout: HomepageLayout =
    themeSettings?.homepageLayout in HOMEPAGE_LAYOUTS
      ? (themeSettings?.homepageLayout as HomepageLayout)
      : HOMEPAGE_LAYOUTS.Hero;

  const productCardVariant = themeSettings?.productCardVariant ?? 'standard';
  const { data, isLoading, isError } = useLandingPage();

  if (isLoading) return <LoadingProgress />;
  if (isError)
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Typography color="error" textAlign="center" mt={6}>
          Failed to load landing page data.
        </Typography>
      </Box>
    );

  const landingData: LandingPageData = data ?? {
    title: '',
    subtitle: '',
    bannerImageUrl: '',
    ctaButtonText: '',
    ctaButtonLink: '',
    homepageLayout: layout,
    sections: [],
  };

  const sections = landingData.sections ?? [];

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.HOME}>
      <Box
        sx={{
          height: '100vh',
          overflowY: 'auto',
          px: { xs: 1, sm: 2 },
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          {layout === HOMEPAGE_LAYOUTS.Hero && landingData.bannerImageUrl && (
            <>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 7',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 2,
                }}
              >
                <Box
                  component="img"
                  src={landingData.bannerImageUrl}
                  alt="Banner"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                    opacity: 0.5,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    zIndex: 1,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    px: 2,
                    pt: 6,
                    zIndex: 2,
                    color: 'white',
                    textAlign: 'center',
                  }}
                >
                  {landingData.title && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      <Typography variant="h1" fontWeight="bold" gutterBottom>
                        {landingData.title}
                      </Typography>
                    </motion.div>
                  )}
                  {landingData.subtitle && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.9, delay: 0.2 }}
                    >
                      <Typography variant="h2">
                        {landingData.subtitle}
                      </Typography>
                    </motion.div>
                  )}
                </Box>
              </Box>

              {landingData.ctaButtonText && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4 }}
                  style={{ textAlign: 'center', marginBottom: '2rem' }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    component={Link}
                    to={landingData.ctaButtonLink || '/products'}
                  >
                    {landingData.ctaButtonText}
                  </Button>
                </motion.div>
              )}
            </>
          )}

          {layout === HOMEPAGE_LAYOUTS.Minimal && (
            <Box mt={4} textAlign="center">
              <Typography variant="h4">{landingData.title}</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {landingData.subtitle}
              </Typography>
            </Box>
          )}

          {sections.length > 0 && (
            <Box
              mt={6}
              display={layout === HOMEPAGE_LAYOUTS.Grid ? 'grid' : 'flex'}
              gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
              flexDirection="column"
              gap={3}
            >
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Box
                    p={2}
                    borderRadius={2}
                    boxShadow={1}
                    bgcolor="background.paper"
                  >
                    {section.title && (
                      <Typography variant="h6" gutterBottom>
                        {section.title}
                      </Typography>
                    )}
                    {section.content && (
                      <Typography variant="body2" color="text.secondary">
                        {section.content}
                      </Typography>
                    )}
                  </Box>
                </motion.div>
              ))}
            </Box>
          )}

          {layout === HOMEPAGE_LAYOUTS.Promo && (
            <Box mt={6}>
              <Typography variant="h5" textAlign="center">
                Promotional layout coming soon!
              </Typography>
            </Box>
          )}

          <BestSellers variant={productCardVariant} />
        </Container>
      </Box>
    </PageLayout>
  );
}
