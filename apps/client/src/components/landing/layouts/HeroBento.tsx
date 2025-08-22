// components/landing/layouts/HeroBento.tsx
import React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { type LandingPageData } from '@common/types';

export default function HeroBento({ data }: { data: LandingPageData }) {
  const hasBanner = Boolean(data.bannerImageUrl);
  const cards = [
    { title: 'Free shipping', body: 'On orders over $99' },
    { title: '24/7 support', body: 'We’re here anytime' },
    { title: 'Eco materials', body: 'Consciously sourced' },
    { title: '4.9 ★', body: '2,400+ reviews' },
    { title: 'New drops', body: 'Every Friday 10:00' },
    { title: 'Secure checkout', body: 'Stripe + 3D Secure' },
  ];

  return (
    <Box sx={{ position: 'relative', pb: 6 }}>
      {/* Top visual / banner */}
      <Box
        sx={{
          height: { xs: 320, md: 440 },
          borderRadius: 3,
          overflow: 'hidden',
          background: hasBanner
            ? `url(${data.bannerImageUrl}) center/cover no-repeat`
            : (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        }}
      />

      {/* Overlay content */}
      <Container
        maxWidth="lg"
        sx={{ mt: { xs: -18, md: -22 }, position: 'relative' }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gridTemplateAreas: {
              xs: '"lead" "bento"',
              md: '"lead bento"',
            },
          }}
        >
          {/* Lead (headline + CTA) */}
          <Box sx={{ gridArea: 'lead' }}>
            <Paper
              elevation={8}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                backgroundColor: (t) =>
                  t.palette.mode === 'dark'
                    ? 'rgba(20,20,20,.55)'
                    : 'rgba(255,255,255,.55)',
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="h3">{data.title}</Typography>
                {data.subtitle && (
                  <Typography variant="h6" color="text.secondary">
                    {data.subtitle}
                  </Typography>
                )}
                {data.ctaButtonText && data.ctaButtonLink && (
                  <Button
                    size="large"
                    variant="contained"
                    component={RouterLink}
                    to={data.ctaButtonLink}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {data.ctaButtonText}
                  </Button>
                )}
              </Stack>
            </Paper>
          </Box>

          {/* Bento mini-cards */}
          <Box sx={{ gridArea: 'bento' }}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr' },
              }}
            >
              {cards.map((c, i) => (
                <Paper
                  key={i}
                  elevation={3}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: 96,
                  }}
                >
                  <Typography fontWeight={700}>{c.title}</Typography>
                  <Typography color="text.secondary">{c.body}</Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
