import * as React from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useBackgroundStore } from '../../stores/useBackgroundStore';
import './LandingBackground.css';

export default function GlobalBackground() {
  const theme = useTheme();
  const enabled = useBackgroundStore((s) => s.enabled);
  const variant = useBackgroundStore((s) => s.variant);
  if (!enabled) return null;

  const cssVars = {
    '--c1': theme.palette.primary.main,
    '--c2': theme.palette.secondary.main,
    '--c3': theme.palette.error.light,
    '--c4': theme.palette.info.light,
    '--bg-dark': theme.palette.mode === 'dark' ? '#0b1020' : '#eef2ff',
    '--bg-light': theme.palette.background.default,

    /* ⬇️ Make changes obvious */
    '--bg-opacity': 0.75,
    '--veil': 0, // no wash-out overlay
    '--bg-mask': 'full', // don't clip to corners while testing
    '--bg-motion': 'on',
  } as const;

  return createPortal(
    <Box
      key={enabled ? variant : 'off'}
      className={`landing-bg bg--${variant}`}
      sx={cssVars}
    />,
    document.body,
  );
}
