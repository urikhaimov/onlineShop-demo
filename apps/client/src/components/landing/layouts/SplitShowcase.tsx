// components/landing/layouts/SplitShowcase.tsx
import React from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { type LandingPageData } from '@common/types';

export default function SplitShowcase({ data }: { data: LandingPageData }) {
  // Pull a few image URLs from sections of type "image" (fallback to banner)
  const imageUrls =
    data.sections
      ?.map((s: any) => s.imageUrl)
      .filter(Boolean)
      .slice(0, 4) ?? [];
  if (!imageUrls.length && data.bannerImageUrl)
    imageUrls.push(data.bannerImageUrl);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Stack spacing={2} sx={{ pt: { md: 6 } }}>
            <Typography variant="overline" color="primary">
              NEW COLLECTION
            </Typography>
            <Typography variant="h2">{data.title}</Typography>
            {data.subtitle && (
              <Typography variant="h6" color="text.secondary">
                {data.subtitle}
              </Typography>
            )}

            {data.ctaButtonText && data.ctaButtonLink && (
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  component={RouterLink}
                  to={data.ctaButtonLink}
                >
                  {data.ctaButtonText}
                </Button>
                <Button
                  variant="text"
                  size="large"
                  component={RouterLink}
                  to="/products"
                >
                  Browse all
                </Button>
              </Stack>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
            <Grid container spacing={2}>
              {imageUrls.map((url, i) => (
                <Grid key={i} item xs={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      aspectRatio: '4/5',
                      background: `url(${url}) center/cover no-repeat`,
                      transform: `translateY(${(i % 2) * 8}px)`,
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
