export const HOMEPAGE_LAYOUTS = {
  Hero: 'hero',
  Bento: 'bento',
  Split: 'split',
  Mosaic: 'mosaic',
  Story: 'story',
} as const;

export type HomepageLayout =
  (typeof HOMEPAGE_LAYOUTS)[keyof typeof HOMEPAGE_LAYOUTS];
