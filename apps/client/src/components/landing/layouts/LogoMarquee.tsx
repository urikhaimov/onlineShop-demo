// src/components/landing/LogoMarquee.tsx
import * as React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { keyframes } from '@emotion/react';

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

type LogoMarqueeProps = {
  logos: { src: string; alt?: string; width?: number; height?: number }[];
  speedSec?: number; // default 40
  gap?: number; // default 24
  height?: number; // optional fixed row height
};

export default function LogoMarquee({
  logos = [],
  speedSec = 40,
  gap = 24,
  height,
}: LogoMarqueeProps) {
  const theme = useTheme();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Duplicate the list so it loops seamlessly
  const track = React.useMemo(() => [...logos, ...logos], [logos]);

  return (
    <Box
      sx={{
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap,
          height: height ?? 'auto',
          // ✅ camelCase properties only
          whiteSpace: 'nowrap',
          // ✅ use keyframes + conditional animation (no kebab-case)
          animation: reduceMotion
            ? 'none'
            : `${scroll} ${speedSec}s linear infinite`,
          // Make sure images don't shrink
          '& img': {
            display: 'block',
            height: height ? height : 'auto',
            objectFit: 'contain',
          },
        }}
      >
        {track.map((logo, i) => (
          <Box key={`${logo.src}-${i}`} sx={{ display: 'inline-flex' }}>
            <img
              src={logo.src}
              alt={logo.alt ?? 'logo'}
              width={logo.width}
              height={logo.height}
              draggable={false}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
