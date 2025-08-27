// components/landing/LandingLayoutRenderer.tsx
import React, { type ComponentType } from 'react';
import {
  HOMEPAGE_LAYOUTS,
  type HomepageLayout,
  type LandingPageData,
} from '@common/types';

import HeroBento from './layouts/HeroBento';
import SplitShowcase from './layouts/SplitShowcase';
import ProductMosaic from './layouts/ProductMosaic';
import StoryScroll from './layouts/StoryScroll';

type RendererProps = { data: LandingPageData };

// You may not implement every layout right away, so make this Partial
const RENDERERS: Partial<Record<HomepageLayout, ComponentType<RendererProps>>> =
  {
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
  // Normalize and default safely
  const normalized = (data.homepageLayout?.toLowerCase() ||
    HOMEPAGE_LAYOUTS.Hero) as HomepageLayout;

  const Comp = RENDERERS[normalized] ?? HeroBento;

  // IMPORTANT: pass the full object through so cards/bentoCards aren’t lost
  return <Comp data={data} />;
}
