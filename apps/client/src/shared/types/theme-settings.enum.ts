export const HOMEPAGE_LAYOUTS = {
  Grid: 'grid',
  Hero: 'hero',
  Minimal: 'minimal',
  Promo: 'promo',
} as const;

export type HomepageLayout = (typeof HOMEPAGE_LAYOUTS)[keyof typeof HOMEPAGE_LAYOUTS];