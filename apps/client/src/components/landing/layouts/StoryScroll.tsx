// components/landing/layouts/StoryScroll.tsx
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
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import type { LandingPageData } from '@common/types';
import { useThemeStore } from '../../../stores/useThemeStore';

type SectionLike = {
  title?: string;
  content?: string;
  description?: string;
  imageUrl?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type BlockProps = {
  idx: number;
  title?: string;
  content?: string;
  imageUrl?: string;
  radius: number;
  spacingScale: number;
  isDark: boolean;
  brandTint: string;
};

function Block({
  idx,
  title,
  content,
  imageUrl,
  radius,
  spacingScale,
  isDark,
  brandTint,
}: BlockProps) {
  const theme = useTheme();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const leftImage = idx % 2 === 0;

  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : 'translateY(18px)',
        transition: {
          xs: 'opacity .6s ease, transform .6s ease',
          '@media (prefers-reduced-motion: reduce)': 'none',
        } as unknown as React.CSSProperties['transition'],
      }}
    >
      {/* Responsive CSS Grid (no MUI Grid) */}
      <Box
        sx={{
          display: 'grid',
          gap: {
            xs: theme.spacing(3 * spacingScale),
            md: theme.spacing(4 * spacingScale),
          },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gridTemplateAreas: {
            xs: '"image" "text"',
            md: leftImage ? '"image text"' : '"text image"',
          },
        }}
      >
        {/* Image */}
        <Box
          sx={{
            gridArea: 'image',
            borderRadius: radius,
            overflow: 'hidden',
            height: { xs: 260, md: 380 },
            position: 'relative',
            background: imageUrl
              ? `url(${imageUrl}) center/cover no-repeat`
              : theme.vars
                ? `rgba(${theme.vars.palette.action.selectedChannel} / 1)`
                : theme.palette.action.selected,
            // subtle brand-tinted overlay for readability
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${
                isDark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.28)'
              } 75%), ${brandTint}`,
              opacity: 0.5,
              pointerEvents: 'none',
            },
          }}
        />

        {/* Text card */}
        <Box sx={{ gridArea: 'text' }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2 * spacingScale, md: 3 * spacingScale },
              borderRadius: radius,
              boxShadow: isDark ? theme.shadows[4] : theme.shadows[1],
              transition: {
                xs: 'box-shadow .3s ease, transform .3s ease',
                '@media (prefers-reduced-motion: reduce)': 'none',
              } as unknown as React.CSSProperties['transition'],
              '&:hover': {
                boxShadow: isDark ? theme.shadows[6] : theme.shadows[3],
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Stack spacing={1.5}>
              {title && <Typography variant="h4">{title}</Typography>}
              {content && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {content}
                </Typography>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default function StoryScroll({ data }: { data: LandingPageData }) {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();

  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  // Brand tint for overlays
  const brand = themeSettings?.primaryColor || theme.palette.primary.main;
  const brandTint = alpha(brand, isDark ? 0.22 : 0.12);

  const sections = (data.sections ?? []) as SectionLike[];
  const blockGap = clamp(6 * spacingScale, 4, 14); // controls vertical distance between blocks

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      {/* Heading + CTA */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          OUR STORY
        </Typography>
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

      {/* Story blocks */}
      <Stack spacing={{ xs: blockGap, md: blockGap + 4 }}>
        {sections.map((s, i) => (
          <Block
            key={i}
            idx={i}
            title={s.title}
            content={s.content ?? s.description}
            imageUrl={s.imageUrl || data.bannerImageUrl}
            radius={radius}
            spacingScale={spacingScale}
            isDark={isDark}
            brandTint={brandTint}
          />
        ))}
      </Stack>
    </Container>
  );
}
