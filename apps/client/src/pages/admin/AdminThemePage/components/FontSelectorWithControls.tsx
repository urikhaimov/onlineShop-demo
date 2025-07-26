// src/pages/admin/AdminThemePage/components/FontSelectorWithControls.tsx
import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  SelectChangeEvent,
} from '@mui/material';
import { useThemeStore } from '../../../../stores/useThemeStore';

const FONT_GROUPS = {
  'Sans Serif': ['Roboto', 'Open Sans', 'Lato', 'Poppins'],
  Serif: ['Merriweather', 'Playfair Display', 'Georgia'],
  Monospace: ['Courier New', 'Fira Code', 'Source Code Pro'],
};

export default function FontSelectorWithControls() {
  const { themeSettings, updateTheme } = useThemeStore();

  const fontSize = themeSettings.fontSize || 16;
  const fontWeight = themeSettings.fontWeight || 400;

  const handleFontChange = (event: SelectChangeEvent<string>) => {
    updateTheme({ font: event.target.value });
  };

  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    updateTheme({ fontSize: value as number });
  };

  const handleFontWeightChange = (_: Event, value: number | number[]) => {
    updateTheme({ fontWeight: value as number });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Font Settings
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Font</InputLabel>
        <Select
          value={themeSettings.font}
          label="Font"
          onChange={handleFontChange}
        >
          {Object.entries(FONT_GROUPS).map(([group, fonts]) => (
            <optgroup key={group} label={group}>
              {fonts.map((font) => (
                <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </MenuItem>
              ))}
            </optgroup>
          ))}
        </Select>
      </FormControl>

      <Typography gutterBottom>Font Size ({fontSize}px)</Typography>
      <Slider
        value={fontSize}
        onChange={handleFontSizeChange}
        min={10}
        max={32}
        step={1}
        sx={{ mb: 2 }}
      />

      <Typography gutterBottom>Font Weight ({fontWeight})</Typography>
      <Slider
        value={fontWeight}
        onChange={handleFontWeightChange}
        min={100}
        max={900}
        step={100}
      />
    </Box>
  );
}
