import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  watch: () => ThemeSettings;
}

export default function ThemePreview({ watch }: Props) {
  const theme = useTheme();
  const settings = watch();

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Live Preview
      </Typography>

      <Paper
        elevation={3}
        sx={{
          padding: 3,
          backgroundColor: theme.palette.background.paper,
          borderRadius: settings.borderRadius || 12,
          fontFamily: settings.fontFamily || 'Noto Sans Hebrew',
        }}
      >
        <Typography variant="h4" color="primary" gutterBottom>
          {settings.storeName || 'Store Name'}
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          This is a preview of your current theme settings. Adjust the options
          above to see changes reflected here.
        </Typography>

        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            borderRadius: 2,
          }}
        >
          Secondary color block
        </Box>
      </Paper>
    </Box>
  );
}
