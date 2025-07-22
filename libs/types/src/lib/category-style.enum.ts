export const CATEGORY_STYLES = {
  Grid: 'grid',
  List: 'list',
  Carousel: 'carousel',
  Minimal: 'minimal',
  Boxed: 'boxed',
} as const;

export type CategoryStyle =
  (typeof CATEGORY_STYLES)[keyof typeof CATEGORY_STYLES];
