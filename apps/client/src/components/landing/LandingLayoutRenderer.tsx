// components/landing/LandingLayoutRenderer.tsx
import * as React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  HOMEPAGE_LAYOUTS,
  type HomepageLayout,
  type LandingPageData,
  type TBentoCard,
} from '@common/types';

import HeroBento from './layouts/HeroBento';
import SplitShowcase from './layouts/SplitShowcase';
import ProductMosaic from './layouts/ProductMosaic';
import StoryScroll from './layouts/StoryScroll';
import LogoMarquee from './layouts/LogoMarquee';

type RendererProps = { data: LandingPageData };

// You may not implement every layout right away, so make this Partial
const RENDERERS: Partial<
  Record<HomepageLayout, React.ComponentType<RendererProps>>
> = {
  [HOMEPAGE_LAYOUTS.Hero]: HeroBento,
  [HOMEPAGE_LAYOUTS.Bento]: HeroBento,
  [HOMEPAGE_LAYOUTS.Split]: SplitShowcase,
  [HOMEPAGE_LAYOUTS.Mosaic]: ProductMosaic,
  [HOMEPAGE_LAYOUTS.Story]: StoryScroll,
};

export default function LandingLayoutRenderer({
  data,
}: {
  data: LandingPageData;
}) {
  const theme = useTheme();

  // Normalize and default safely
  const normalized = (data.homepageLayout?.toLowerCase() ||
    HOMEPAGE_LAYOUTS.Hero) as HomepageLayout;

  const Comp = RENDERERS[normalized] ?? HeroBento;

  // Build marquee items from server data (prefer cards, else bentoCards)
  const cards: TBentoCard[] = React.useMemo(() => {
    if (Array.isArray(data.cards) && data.cards.length) return data.cards;
    if (Array.isArray(data.bentoCards) && data.bentoCards.length)
      return data.bentoCards as TBentoCard[];
    return [];
  }, [data.cards, data.bentoCards]);

  // Theme-aware pill background if no icon is provided
  const brand = theme.palette.primary.main;
  const pillBg = alpha(brand, theme.palette.mode === 'dark' ? 0.22 : 0.12);
  const pillBorder = alpha(brand, 0.28);

  return (
    <>
      {/* Main layout */}
      <Comp data={data} />

      {/* Optional marquee under the layout if we have cards/bentoCards */}
      {cards.length > 0 && (
        <Box sx={{ mt: { xs: 3, md: 4 } }}>
          <LogoMarquee>
            {cards.map((c, i) =>
              c.icon ? (
                // If your card has an `icon` URL, show the logo
                <img
                  key={`${c.icon}-${i}`}
                  src={c.icon}
                  alt={c.title || `logo-${i}`}
                  style={{ display: 'block' }}
                  loading="lazy"
                />
              ) : (
                // Otherwise, render a brand-tinted pill with the title
                <Box
                  key={`${c.title ?? 'pill'}-${i}`}
                  component="span"
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 32,
                    backgroundColor: pillBg,
                    border: `1px solid ${pillBorder}`,
                    boxShadow: theme.shadows[1],
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.title}
                  </Typography>
                </Box>
              ),
            )}
          </LogoMarquee>
        </Box>
      )}
    </>
  );
}
