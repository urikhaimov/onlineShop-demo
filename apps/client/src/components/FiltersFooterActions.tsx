import * as React from 'react';
import { Box, Button, SxProps, Theme } from '@mui/material';
import { darken } from '@mui/material/styles';
import { useThemeStore } from '../stores/useThemeStore';
import { useTranslation } from 'react-i18next';

type Props = {
  onReset: () => void;
  onApply?: () => void; // optional
  showApply?: boolean; // control visibility (e.g., isMobile)
  size?: 'small' | 'medium' | 'large';
  /** same min width for both buttons */
  minButtonWidth?: number; // default 120
  /** spacing on top; and custom sx for wrapper */
  sx?: SxProps<Theme>;
  /** labels (i18n friendly) — if provided, overrides i18n */
  resetLabel?: string;
  applyLabel?: string;
};

const BTN_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
};

export default function FiltersFooterActions({
  onReset,
  onApply,
  showApply = true,
  size = 'small',
  minButtonWidth = 120,
  sx,
  resetLabel,
  applyLabel,
}: Props) {
  const { t } = useTranslation();
  const { themeSettings } = useThemeStore();
  const primaryColor = themeSettings?.primaryColor || '#1976d2';
  const borderRadius = themeSettings?.borderRadius ?? 2;

  const resetText = resetLabel ?? t('filters.reset');
  const applyText = applyLabel ?? t('actions.apply');

  return (
    <Box display="flex" justifyContent="space-between" sx={{ pt: 0.5, ...sx }}>
      <Button
        onClick={onReset}
        variant="outlined"
        color="secondary"
        size={size}
        sx={{ ...BTN_SX, minWidth: minButtonWidth, borderRadius }}
      >
        {resetText}
      </Button>

      {showApply && (
        <Button
          onClick={onApply}
          variant="contained"
          size={size}
          disableElevation
          sx={{
            ...BTN_SX,
            minWidth: minButtonWidth,
            borderRadius,
            background: `${primaryColor} !important`,
            backgroundImage: 'none !important',
            color: '#fff',
            boxShadow: 'none',
            '&:hover': {
              background: `${darken(primaryColor, 0.12)} !important`,
              backgroundImage: 'none !important',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              background: (t) =>
                `${t.palette.action.disabledBackground} !important`,
              color: (t) => t.palette.action.disabled,
            },
          }}
        >
          {applyText}
        </Button>
      )}
    </Box>
  );
}
