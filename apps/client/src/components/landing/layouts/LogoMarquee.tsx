// components/landing/LogoMarquee.tsx
import * as React from 'react';
import { Box, useTheme } from '@mui/material';
import { useThemeStore } from '../../../stores/useThemeStore';

type Props = {
  children: React.ReactNode;
  /** Seconds for a full loop (default is derived from spacingScale) */
  speed?: number;
  /** Gap between logos; number uses theme.spacing (8px grid) */
  gap?: number | string;
  /** Pause animation on hover (default true) */
  pauseOnHover?: boolean;
  /** Max logo height (px) */
  maxLogoHeight?: number;
};

export default function LogoMarquee({
  children,
  speed,
  gap,
  pauseOnHover = true,
  maxLogoHeight = 28,
}: Props) {
  const t = useTheme();
  const { themeSettings } = useThemeStore();
  const isDark =
    themeSettings?.darkMode ?? (t.palette.mode === 'dark' ? true : false);

  // Derive sensible defaults from theme settings
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const seconds = speed ?? Math.max(14, Math.round(24 / spacingScale) * 2); // slower if spacing scale is small

  // Compute background color for the edge fade
  const bgSolid =
    t.vars && t.vars.palette?.background?.defaultChannel
      ? `rgba(${t.vars.palette.background.defaultChannel} / 1)`
      : t.palette.background.default;

  // Resolve gap value
  const resolvedGap =
    typeof gap === 'number'
      ? t.spacing(gap)
      : (gap ?? t.spacing(4 * spacingScale));

  // Duplicate children once for seamless loop
  const content = React.useMemo(
    () => (
      <>
        {children}
        {children}
      </>
    ),
    [children],
  );

  return (
    <Box
      role="presentation"
      aria-hidden="true"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: 2,
        // Edge fades that blend into the page background
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: t.spacing(8),
          zIndex: 1,
          pointerEvents: 'none',
        },
        '&::before': {
          left: 0,
          background: `linear-gradient(to right, ${bgSolid}, transparent)`,
        },
        '&::after': {
          right: 0,
          background: `linear-gradient(to left, ${bgSolid}, transparent)`,
        },
        // Pause on hover if desired
        ...(pauseOnHover && {
          '&:hover .marquee-track': { animationPlayState: 'paused' as const },
        }),
      }}
    >
      <Box
        className="marquee-track"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: resolvedGap,
          whiteSpace: 'nowrap',
          // Respect user motion preferences
          animation: {
            '@media (prefers-reduced-motion: reduce)': 'none',
            all: `${seconds}s linear infinite marquee`,
          } as Record<string, string>,
          '@keyframes marquee': {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
          // Make logos look good across themes
          '& img, & svg': {
            maxHeight: maxLogoHeight,
            height: 'auto',
            opacity: isDark ? 0.9 : 0.8,
            // Gentle tweak in dark mode for better contrast without forcing monochrome
            filter: isDark ? 'brightness(1.05) contrast(1.05)' : 'none',
          },
          // Slight rounding that follows theme
          borderRadius: (themeSettings?.borderRadius ??
            t.shape.borderRadius) as number,
        }}
      >
        {content}
      </Box>
    </Box>
  );
}
