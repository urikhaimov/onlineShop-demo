// src/components/layout/PageCard.tsx
import * as React from 'react';
import { Box, Paper } from '@mui/material';
import { headerHeight, footerHeight } from '../config/themeConfig';
import { useThemeStore } from '../stores/useThemeStore';
import {
  contentBoxSx,
  contentPaperSx,
  getLayoutTokens,
} from '../utils/uiLayout';

type Pad =
  | number
  | {
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };

export type PageCardProps = {
  children: React.ReactNode;
  /** Picks maxWidth/radius from tokens (you can add more variants as you use them) */
  variant?: 'form' | 'detail' | 'table' | 'default';
  /** MUI Paper elevation */
  elevation?: number;
  /** Padding *multipliers* (will be multiplied by spacingScale). Defaults xs=3, sm=3.5, md=4 */
  pad?: Pad;
  /** Optional overrides */
  maxWidthOverride?: number;
  radiusOverride?: number;
};

export default function PageCard({
  children,
  variant = 'form',
  elevation = 2,
  pad,
  maxWidthOverride,
  radiusOverride,
}: PageCardProps) {
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);

  const tokens = getLayoutTokens(themeSettings);
  const contentMax = maxWidthOverride ?? tokens.contentMax;
  const radius = radiusOverride ?? tokens.radius;

  const padObj =
    typeof pad === 'number'
      ? { xs: pad, sm: pad, md: pad }
      : (pad ?? { xs: 3, sm: 3.5, md: 4 });

  return (
    <Box sx={contentBoxSx(headerHeight, footerHeight)}>
      <Paper elevation={elevation} sx={contentPaperSx({ contentMax, radius })}>
        <Box
          sx={{
            p: {
              xs: (padObj.xs ?? 3) * spacingScale,
              sm: (padObj.sm ?? padObj.xs ?? 3.5) * spacingScale,
              md: (padObj.md ?? padObj.sm ?? 4) * spacingScale,
              lg: (padObj.lg ?? padObj.md ?? padObj.sm ?? 4) * spacingScale,
              xl: (padObj.xl ?? padObj.lg ?? padObj.md ?? 4) * spacingScale,
            },
          }}
        >
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
