// src/components/ColorModeIconDropdown.tsx (now a simple toggle)
import * as React from 'react';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import Box from '@mui/material/Box';
import IconButton, { IconButtonOwnProps } from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import { useThemeStore } from '../../../stores/useThemeStore';

export default function ColorModeIconToggle(props: IconButtonOwnProps) {
  const { mode, systemMode, setMode } = useColorScheme();
  const setDarkMode = useThemeStore((s) => s.setDarkMode); // persists to your API

  // while MUI css-vars context is booting
  if (!mode) {
    return (
      <Box
        sx={(theme) => ({
          verticalAlign: 'bottom',
          display: 'inline-flex',
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: (theme.vars || theme).shape.borderRadius,
          border: '1px solid',
          borderColor: (theme.vars || theme).palette.divider,
        })}
      />
    );
  }

  const resolved = (systemMode || mode) as 'light' | 'dark';
  const isDark = resolved === 'dark';

  const handleToggle = async () => {
    const next: 'light' | 'dark' = isDark ? 'light' : 'dark';
    // 1) instant UI change
    setMode(next);
    // 2) persist in your backend/zustand
    try {
      await setDarkMode(next === 'dark');
    } catch {
      // ignore persist error; UI already updated
    }
  };

  return (
    <IconButton
      onClick={handleToggle}
      disableRipple
      size="small"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      {...props}
    >
      {isDark ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  );
}
