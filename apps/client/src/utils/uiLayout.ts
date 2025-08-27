// Reusable layout helpers for admin pages
import type { SxProps, Theme } from '@mui/material/styles';
import type { ThemeSettings } from '../api/theme';

const MAX_WIDTH_MAP: Record<NonNullable<ThemeSettings['maxWidth']>, number> = {
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
  full: Infinity,
};

export function getMaxWidthPx(maxWidth?: ThemeSettings['maxWidth']): number {
  return (
    MAX_WIDTH_MAP[(maxWidth || 'lg') as keyof typeof MAX_WIDTH_MAP] ?? 1200
  );
}

export type LayoutKind = 'form' | 'page';

/** Derives spacing/radius and clamps max width (920 for forms, 1280 for wide pages). */
export function getLayoutTokens(
  theme: ThemeSettings,
  kind: LayoutKind = 'form',
) {
  const pad = 3 * (theme.spacingScale ?? 1);
  const sectionPad = Math.max(2, pad - 1);
  const radius = 2;
  console.log('radius', radius);
  const cap = kind === 'form' ? 920 : 1280;
  const contentMax = Math.min(getMaxWidthPx(theme.maxWidth), cap);
  return { pad, sectionPad, radius, contentMax };
}

/** Standard scrollable content box under a sticky header, with no top margin. */
export function contentBoxSx(
  headerHeight: number,
  footerHeight: number,
): SxProps<Theme> {
  return {
    mb: `${footerHeight}px`,
    height: `calc(100vh - ${headerHeight + footerHeight}px)`,
    display: 'flex',
    justifyContent: 'center',
    overflowY: 'auto',
    px: 2,
    py: 3,
  };
}

/** Paper shell for pages. Pass `pad` if you want internal padding, otherwise omit. */
export function contentPaperSx(args: {
  contentMax: number;
  radius: number;
  pad?: number;
}): SxProps<Theme> {
  const { contentMax, radius, pad } = args;
  return {
    width: '100%',
    maxWidth: contentMax,
    borderRadius: radius,
    ...(pad ? { p: pad } : {}),
  };
}
