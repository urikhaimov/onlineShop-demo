// components/landing/layouts/ProductMosaic.tsx
import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { LandingPageData } from '@common/types';

type Tile = {
  url: string;
  title?: string;
  blurb?: string;
  cols: number; // 12-col grid span (md+)
  ratio: string; // CSS aspect-ratio
};

function collectImages(
  data: LandingPageData,
): { url: string; title?: string; blurb?: string }[] {
  const fromSections =
    data.sections
      ?.map((s: any) => ({
        url: s.imageUrl || '',
        title: s.title,
        blurb: s.content,
      }))
      .filter((x) => !!x.url) ?? [];

  if (!fromSections.length && data.bannerImageUrl) {
    return [
      { url: data.bannerImageUrl, title: data.title, blurb: data.subtitle },
    ];
  }
  return fromSections;
}

function toPattern(
  imgs: { url: string; title?: string; blurb?: string }[],
): Tile[] {
  const pattern: Array<Pick<Tile, 'cols' | 'ratio'>> = [
    { cols: 6, ratio: '16/9' },
    { cols: 3, ratio: '1/1' },
    { cols: 3, ratio: '4/5' },
    { cols: 4, ratio: '4/3' },
    { cols: 4, ratio: '1/1' },
    { cols: 4, ratio: '4/5' },
  ];
  return imgs.map((img, i) => ({ ...img, ...pattern[i % pattern.length] }));
}

export default function ProductMosaic({ data }: { data: LandingPageData }) {
  const tiles = toPattern(collectImages(data));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
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
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {data.ctaButtonText}
          </Button>
        )}
      </Stack>

      {/* CSS Grid container */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr', // 1 col mobile
            sm: 'repeat(6, 1fr)', // 6-col tablet
            md: 'repeat(12, 1fr)', // 12-col desktop
          },
        }}
      >
        {tiles.map((t, i) => (
          <Box
            key={i}
            sx={{
              gridColumn: {
                xs: 'span 1',
                sm: t.cols === 6 ? 'span 6' : 'span 3',
                md: `span ${t.cols}`,
              },
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 3,
              aspectRatio: t.ratio,
              background: `url(${t.url}) center/cover no-repeat`,
              transition: 'transform .4s ease',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            {(t.title || t.blurb) && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  p: 2,
                  color: 'common.white',
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.7) 100%)',
                }}
              >
                {t.title && <Typography fontWeight={700}>{t.title}</Typography>}
                {t.blurb && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t.blurb}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Container>
  );
}
