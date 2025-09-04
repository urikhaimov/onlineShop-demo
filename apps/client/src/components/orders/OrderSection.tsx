import * as React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useThemeStore } from '../../stores/useThemeStore';

type GridSpan =
  | string
  | number
  | {
      xs?: string | number;
      sm?: string | number;
      md?: string | number;
      lg?: string | number;
      xl?: string | number;
    };

type Props = React.PropsWithChildren<{
  title: React.ReactNode;
  gridSpan?: GridSpan;
}>;

const OrderSection: React.FC<Props> = ({ title, gridSpan, children }) => {
  const mui = useTheme();
  const { themeSettings } = useThemeStore();
  const isDark = themeSettings?.darkMode ?? mui.palette.mode === 'dark';
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const baseRadius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);

  return (
    <Box
      sx={{
        gridColumn: gridSpan as unknown,
        mx: { xs: 0.75 * spacingScale, sm: 1 * spacingScale },
        my: { xs: 0.75 * spacingScale, sm: 1 * spacingScale },
        px: { xs: 1.25 * spacingScale, sm: 1.5 * spacingScale },
        py: { xs: 1 * spacingScale, sm: 1.25 * spacingScale },
        border: `1px solid ${mui.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: isDark ? mui.shadows[2] : mui.shadows[1],
        borderRadius: baseRadius,
        minWidth: 0,
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      <Typography variant="subtitle2">{title}</Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
};

export default OrderSection;
