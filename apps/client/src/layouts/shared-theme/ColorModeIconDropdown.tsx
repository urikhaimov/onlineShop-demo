// src/components/ColorModeIconDropdown.tsx
import * as React from 'react';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import Box from '@mui/material/Box';
import IconButton, { IconButtonOwnProps } from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useColorScheme } from '@mui/material/styles';
import { useThemeStore } from '../../stores/useThemeStore';

export default function ColorModeIconDropdown(props: IconButtonOwnProps) {
  const { mode, systemMode, setMode } = useColorScheme();
  const setDarkMode = useThemeStore((s) => s.setDarkMode);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMode = (target: 'system' | 'light' | 'dark') => async () => {
    setMode(target); // immediate visual change
    if (target === 'light') await setDarkMode(false);
    if (target === 'dark') await setDarkMode(true);
    setAnchorEl(null);
  };

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

  const resolvedMode = (systemMode || mode) as 'light' | 'dark';
  const icon = resolvedMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />;

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disableRipple
        size="small"
        aria-controls={open ? 'color-scheme-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        {...props}
      >
        {icon}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="color-scheme-menu"
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: { variant: 'outlined', elevation: 0, sx: { my: '4px' } },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem selected={mode === 'system'} onClick={handleMode('system')}>
          System
        </MenuItem>
        <MenuItem selected={mode === 'light'} onClick={handleMode('light')}>
          Light
        </MenuItem>
        <MenuItem selected={mode === 'dark'} onClick={handleMode('dark')}>
          Dark
        </MenuItem>
      </Menu>
    </>
  );
}
