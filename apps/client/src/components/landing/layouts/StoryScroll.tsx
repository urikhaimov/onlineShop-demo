// components/landing/layouts/StoryScroll.tsx
import React from 'react';
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
import { useInView } from 'react-intersection-observer';
import type { LandingPageData } from '@common/types';

type SectionLike = {
  title?: string;
  content?: string;
  description?: string;
  imageUrl?: string;
};

function Block({
  idx,
  title,
  content,
  imageUrl,
}: {
  idx: number;
  title?: string;
  content?: string;
  imageUrl?: string;
}) {
  const theme = useTheme();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const leftImage = idx % 2 === 0;

  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : 'translateY(18px)',
        transition: 'opacity .6s ease, transform .6s ease',
      }}
    >
      {/* Responsive CSS Grid (no MUI Grid) */}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 4 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gridTemplateAreas: {
            xs: '"image" "text"',
            md: leftImage ? '"image text"' : '"text image"',
          },
        }}
      >
        {/* image */}
        <Box
          sx={{
            gridArea: 'image',
            borderRadius: 3,
            overflow: 'hidden',
            height: { xs: 260, md: 380 },
            background: imageUrl
              ? `url(${imageUrl}) center/cover no-repeat`
              : theme.palette.action.selected,
          }}
        />

        {/* text */}
        <Box sx={{ gridArea: 'text' }}>
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}
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
  const sections = (data.sections ?? []) as SectionLike[];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary">
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

      <Stack spacing={{ xs: 6, md: 10 }}>
        {sections.map((s, i) => (
          <Block
            key={i}
            idx={i}
            title={s.title}
            content={s.content ?? s.description}
            imageUrl={s.imageUrl || data.bannerImageUrl}
          />
        ))}
      </Stack>
    </Container>
  );
}
