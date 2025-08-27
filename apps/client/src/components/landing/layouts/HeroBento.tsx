// apps/client/src/components/landing/layouts/HeroBento.tsx
import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { LandingPageData, TBentoCard } from '@common/types';

type Props = { data: LandingPageData };

export default function HeroBento({ data }: Props) {
  const hasBanner = Boolean(data.bannerImageUrl);

  // Prefer `cards`, fall back to legacy `bentoCards`
  const cards: TBentoCard[] = React.useMemo(() => {
    const fromCards = Array.isArray(data.cards)
      ? (data.cards as TBentoCard[])
      : [];
    const fromLegacy = Array.isArray(data.bentoCards)
      ? (data.bentoCards as TBentoCard[])
      : [];
    return fromCards.length ? fromCards : fromLegacy;
  }, [data.cards, data.bentoCards]);
  console.log('data:', data);
  console.log('cards:', cards);
  return (
    <Box sx={{ position: 'relative', pb: 6 }}>
      {/* Top visual / banner */}
      <Box
        sx={(theme) => ({
          height: { xs: 320, md: 440 },
          borderRadius: 3,
          overflow: 'hidden',
          background: hasBanner
            ? `url(${data.bannerImageUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        })}
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
            gridTemplateAreas: { xs: '"lead" "bento"', md: '"lead bento"' },
          }}
        >
          {/* Lead (headline + CTA) */}
          <Box sx={{ gridArea: 'lead' }}>
            <Paper
              elevation={8}
              sx={(t) => ({
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                backgroundColor:
                  t.palette.mode === 'dark'
                    ? 'rgba(20,20,20,.55)'
                    : 'rgba(255,255,255,.55)',
              })}
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

          {/* Bento mini-cards (from server) */}
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
                  key={`${c.title}-${i}`}
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
                  {c.body && (
                    <Typography color="text.secondary">{c.body}</Typography>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
