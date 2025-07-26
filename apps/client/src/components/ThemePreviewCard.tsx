// src/components/ThemePreviewCard.tsx
import React from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { useThemeStore } from '../stores/useThemeStore';

export default function ThemePreviewCard() {
  const { themeSettings } = useThemeStore();

  return (
    <Card
      elevation={3}
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 3,
        backgroundImage: themeSettings.backgroundImageUrl
          ? `url(${themeSettings.backgroundImageUrl})`
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: themeSettings.darkMode ? '#fff' : 'inherit',
      }}
    >
      <CardContent
        sx={{
          backdropFilter: themeSettings.backgroundImageUrl
            ? 'blur(2px)'
            : 'none',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {themeSettings.logoUrl && (
            <img
              src={themeSettings.logoUrl}
              alt="Logo"
              style={{ height: 50, objectFit: 'contain' }}
            />
          )}
          <Typography variant="h5" fontFamily={themeSettings.font}>
            {themeSettings.storeName || 'Your Store Name'}
          </Typography>
        </Box>

        <Box mt={2}>
          <Typography variant="body2">
            Layout: <strong>{themeSettings.homepageLayout}</strong>
          </Typography>
          <Typography variant="body2">
            Product Cards: <strong>{themeSettings.productCardVariant}</strong>
          </Typography>
          <Typography variant="body2">
            Categories: <strong>{themeSettings.categoryStyle}</strong>
          </Typography>
        </Box>

        {themeSettings.announcementBar?.text && (
          <Box
            mt={2}
            p={1.5}
            borderRadius={1}
            sx={{
              backgroundColor: themeSettings.announcementBar.backgroundColor,
              color: themeSettings.announcementBar.textColor,
            }}
          >
            <Typography variant="body2" align="center">
              {themeSettings.announcementBar.text}
            </Typography>
          </Box>
        )}

        <Box mt={3}>
          <Button variant="contained" color="primary">
            Primary Button
          </Button>{' '}
          <Button variant="outlined" color="secondary">
            Secondary Action
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
