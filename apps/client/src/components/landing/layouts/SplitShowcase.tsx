// components/landing/layouts/SplitShowcase.tsx
import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { LandingPageData } from '@common/types';
import { useThemeStore } from '../../../stores/useThemeStore';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function SplitShowcase({ data }: { data: LandingPageData }) {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();

  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  // Spacing derived from store
  const unit = clamp(Math.round(2 * spacingScale), 1, 6);
  const gap = theme.spacing(unit);
  const stackGap = unit;

  // Slightly stronger shadow in dark
  const cardShadow = isDark ? theme.shadows[6] : theme.shadows[3];

  // Pull a few image URLs from sections of type "image" (fallback to banner)
  const imageUrls =
    data.sections
      ?.map((s: any) => s?.imageUrl)
      .filter(Boolean)
      .slice(0, 4) ?? [];
  if (!imageUrls.length && data.bannerImageUrl)
    imageUrls.push(data.bannerImageUrl);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* Outer CSS Grid layout (Box-as-grid) */}
      <Box
        sx={{
          display: 'grid',
          gap,
          gridTemplateAreas: {
            xs: '"left" "right"',
            md: '"left right"',
          },
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr',
          },
          alignItems: 'start',
        }}
      >
        {/* Left column: text & CTA */}
        <Box sx={{ gridArea: 'left' }}>
          <Stack spacing={stackGap} sx={{ pt: { md: 6 } }}>
            <Typography variant="overline" sx={{ color: 'primary.main' }}>
              NEW COLLECTION
            </Typography>

            <Typography variant="h2">{data.title}</Typography>

            {data.subtitle && (
              <Typography variant="h6" color="text.secondary">
                {data.subtitle}
              </Typography>
            )}

            {data.ctaButtonText && data.ctaButtonLink && (
              <Stack direction="row" spacing={unit} sx={{ pt: 1 }}>
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
        </Box>

        {/* Right column: sticky image grid */}
        <Box
          sx={{
            gridArea: 'right',
            position: { md: 'sticky' },
            top: { md: 96 },
          }}
        >
          {/* Inner CSS Grid for images */}
          <Box
            sx={{
              display: 'grid',
              gap,
              gridTemplateColumns: 'repeat(2, 1fr)',
            }}
          >
            {imageUrls.map((url, i) => (
              <Box key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: radius,
                    overflow: 'hidden',
                    aspectRatio: '4 / 5',
                    background: `url(${url}) center/cover no-repeat`,
                    transform: `translateY(${(i % 2) * 8}px)`,
                    boxShadow: cardShadow,
                    transition: 'transform .3s ease, box-shadow .3s ease',
                    '&:hover': {
                      transform: `translateY(${(i % 2) * 8 - 4}px)`,
                      boxShadow: isDark ? theme.shadows[8] : theme.shadows[4],
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
