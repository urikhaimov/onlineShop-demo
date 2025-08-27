// components/landing/layouts/ProductMosaic.tsx
import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import type { LandingPageData, TBentoCard } from '@common/types';
import { useThemeStore } from '../../../stores/useThemeStore';

type Tile = {
  url: string;
  title?: string;
  blurb?: string;
  colSpan: number; // desktop 12-col grid span
  rowSpan: number; // vertical size unit
  ratio?: string; // aspect-ratio for small screens
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

function toMosaic(
  imgs: { url: string; title?: string; blurb?: string }[],
): Tile[] {
  if (!imgs.length) return [];
  const pool = [...imgs];
  while (pool.length < 6) pool.push(...imgs);

  const pattern: Array<Pick<Tile, 'colSpan' | 'rowSpan' | 'ratio'>> = [
    { colSpan: 8, rowSpan: 2, ratio: '16/9' }, // HERO
    { colSpan: 4, rowSpan: 1, ratio: '1/1' },
    { colSpan: 4, rowSpan: 1, ratio: '4/5' },
    { colSpan: 4, rowSpan: 1, ratio: '4/3' },
    { colSpan: 6, rowSpan: 1, ratio: '16/10' },
    { colSpan: 6, rowSpan: 1, ratio: '1/1' },
  ];

  return pool.slice(0, 6).map((img, i) => ({
    url: img.url,
    title: img.title,
    blurb: img.blurb,
    ...pattern[i % pattern.length],
  }));
}

export default function ProductMosaic({ data }: { data: LandingPageData }) {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();

  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  const brand = themeSettings?.primaryColor || theme.palette.primary.main;
  const brandTint = alpha(brand, isDark ? 0.22 : 0.12);

  const tiles = toMosaic(collectImages(data));
  const cards: TBentoCard[] = React.useMemo(() => {
    if (Array.isArray(data.cards) && data.cards.length) return data.cards;
    if (Array.isArray(data.bentoCards) && data.bentoCards.length)
      return data.bentoCards as TBentoCard[];
    return [];
  }, [data.cards, data.bentoCards]);

  const gap = theme.spacing(2 * spacingScale);
  const hoverShadow = isDark ? theme.shadows[8] : theme.shadows[4];
  const baseShadow = theme.shadows[1];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* Header + CTA */}
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

      {/* Mosaic Grid */}
      <Box
        sx={{
          display: 'grid',
          gap,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(6, 1fr)',
            md: 'repeat(12, 1fr)',
          },
          gridAutoRows: {
            xs: 'auto',
            sm: '12px',
            md: '12px',
          },
        }}
      >
        {tiles.map((t, i) => {
          const colSpan = {
            xs: 'span 1',
            sm:
              t.colSpan >= 6
                ? 'span 6'
                : `span ${Math.max(3, Math.min(6, t.colSpan))}`,
            md: `span ${t.colSpan}`,
          };
          const yOffset = (i % 2) * 6;
          const rowSpan = {
            xs: 'auto',
            sm: `span ${t.rowSpan * 10}`,
            md: `span ${t.rowSpan * 10}`,
          };

          // Prefer card text; for the FIRST tile force page title/subtitle
          const card = cards.length ? cards[i % cards.length] : undefined;
          const baseTitle = card?.title ?? t.title;
          const baseBlurb = card?.body ?? t.blurb;

          const overlayTitle = i === 0 ? data.title || baseTitle : baseTitle;
          const overlayBlurb =
            i === 0 ? (data.subtitle ?? baseBlurb) : baseBlurb;

          // Slightly stronger overlay on the hero tile
          const overlayStrength = i === 0 ? 0.75 : 0.6;

          return (
            <Box
              key={i}
              sx={{
                position: 'relative',
                gridColumn: colSpan,
                gridRow: rowSpan,
                overflow: 'hidden',
                borderRadius: radius,
                aspectRatio: { xs: t.ratio ?? '4/3', sm: 'auto' },
                background: `url(${t.url}) center/cover no-repeat`,
                boxShadow: baseShadow,
                transition: {
                  xs: 'transform .28s ease, box-shadow .28s ease',
                  '@media (prefers-reduced-motion: reduce)': 'none',
                } as any,
                '&:hover': {
                  transform: {
                    xs: 'translateY(-4px)',
                    sm: `translateY(-${yOffset}px)`,
                  },
                  boxShadow: hoverShadow,
                },
                transform: { xs: 'none', sm: `translateY(${yOffset}px)` },
              }}
            >
              {/* Brand-tinted + dark/light overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${
                    isDark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.28)'
                  } 70%), ${brandTint}`,
                  opacity: overlayStrength,
                  transition: {
                    xs: 'opacity .28s ease',
                    '@media (prefers-reduced-motion: reduce)': 'none',
                  } as any,
                  pointerEvents: 'none',
                  borderRadius: 'inherit',
                  '&:hover': { opacity: Math.min(overlayStrength + 0.1, 0.9) },
                }}
              />

              {(overlayTitle || overlayBlurb) && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    p: theme.spacing(2 * spacingScale),
                    color: 'common.white',
                    textShadow: isDark
                      ? '0 1px 2px rgba(0,0,0,.7)'
                      : '0 1px 2px rgba(0,0,0,.45)',
                  }}
                >
                  {overlayTitle && (
                    <Typography
                      variant={i === 0 ? 'h4' : 'subtitle1'}
                      fontWeight={700}
                      sx={{ lineHeight: 1.2 }}
                    >
                      {overlayTitle}
                    </Typography>
                  )}
                  {overlayBlurb && (
                    <Typography
                      variant={i === 0 ? 'subtitle1' : 'body2'}
                      sx={{ opacity: 0.95, mt: 0.25 }}
                    >
                      {overlayBlurb}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Container>
  );
}
