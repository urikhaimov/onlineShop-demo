// components/landing/LandingLayoutRenderer.tsx
import React from 'react';
import {
  HOMEPAGE_LAYOUTS,
  type HOMEPAGE_LAYOUT,
  type LandingPageData,
} from '@common/types';
import HeroBento from './layouts/HeroBento';
import SplitShowcase from './layouts/SplitShowcase';
import ProductMosaic from './layouts/ProductMosaic';
import StoryScroll from './layouts/StoryScroll';

const RENDERERS: Record<
  HOMEPAGE_LAYOUT,
  React.FC<{ data: LandingPageData }>
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
  const Comp = RENDERERS[data.homepageLayout] ?? HeroBento;
  return <Comp data={data} />;
}
