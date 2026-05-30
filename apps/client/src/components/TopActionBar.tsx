// src/components/TopActionBar.tsx
import * as React from 'react';
import { Stack, Button, SxProps, Theme } from '@mui/material';
import { darken } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import TableRowsIcon from '@mui/icons-material/TableRows';
import GridViewIcon from '@mui/icons-material/GridView';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/useThemeStore';

export type ViewMode = 'table' | 'cards';

type Props = {
  viewMode: ViewMode;
  onChangeView: (mode: ViewMode) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  size?: 'small' | 'medium' | 'large'; // default: small
  /** Fixed width for all buttons (px or any CSS length). Default: 140 */
  buttonWidth?: number | string;
  sx?: SxProps<Theme>;
  leftSx?: SxProps<Theme>;
  rightSx?: SxProps<Theme>;
};

const BUTTON_SX: SxProps<Theme> = {
  textTransform: 'none',
  px: 1.5,
  minHeight: 34,
  borderRadius: 2,
};

export default function TopActionBar({
  viewMode,
  onChangeView,
  onOpenFilters,
  onResetFilters,
  size = 'small',
  buttonWidth = 140,
  sx,
  leftSx,
  rightSx,
}: Props) {
  const { t } = useTranslation();
  const primaryColor = useThemeStore(
    (s) => s.themeSettings?.primaryColor ?? '#1976d2',
  );

  const baseBtnSx: SxProps<Theme> = { ...BUTTON_SX, width: buttonWidth };

  const activeBtnSx: SxProps<Theme> = {
    ...baseBtnSx,
    backgroundColor: primaryColor,
    color: '#fff',
    borderColor: primaryColor,
    '&:hover': {
      backgroundColor: darken(primaryColor, 0.12),
      borderColor: darken(primaryColor, 0.12),
    },
  };

  const inactiveBtnSx: SxProps<Theme> = {
    ...baseBtnSx,
    borderColor: 'divider',
  };

  // Stable accessible names for e2e + a11y (independent of UI language)
  const a11y = {
    openFilters: t('a11y.openFilters', { defaultValue: 'Open filters' }),
    resetFilters: t('a11y.resetFilters', { defaultValue: 'Reset filters' }),
    tableView: t('a11y.tableView', { defaultValue: 'Table view' }),
    cardsView: t('a11y.cardsView', { defaultValue: 'Cards view' }),
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      flexWrap="wrap"
      sx={{ minWidth: 0, ...sx }}
    >
      {/* Left: Filters + Reset */}
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        sx={{ flexShrink: 0, ...leftSx }}
      >
        <Button
          variant="outlined"
          size={size}
          onClick={onOpenFilters}
          startIcon={<FilterListIcon />}
          disableElevation
          sx={inactiveBtnSx}
          aria-label={a11y.openFilters}
          title={a11y.openFilters}
          data-testid="btn-open-filters"
        >
          {t('filters.open')}
        </Button>

        <Button
          variant="outlined"
          size={size}
          onClick={onResetFilters}
          startIcon={<RestartAltIcon />}
          disableElevation
          sx={inactiveBtnSx}
          aria-label={a11y.resetFilters}
          title={a11y.resetFilters}
          data-testid="btn-reset-filters"
        >
          {t('filters.reset')}
        </Button>
      </Stack>

      {/* Right: Table + Cards */}
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        sx={{ flexShrink: 0, ...rightSx }}
      >
        <Button
          size={size}
          startIcon={<TableRowsIcon />}
          onClick={() => onChangeView('table')}
          disableElevation
          variant="outlined"
          sx={viewMode === 'table' ? activeBtnSx : inactiveBtnSx}
          aria-label="Table view"
          title="Table view"
          data-testid="view-table"
        >
          {t('view.table')}
        </Button>

        <Button
          size={size}
          startIcon={<GridViewIcon />}
          onClick={() => onChangeView('cards')}
          disableElevation
          variant="outlined"
          sx={viewMode === 'cards' ? activeBtnSx : inactiveBtnSx}
          aria-label="Cards view"
          title="Cards view"
          data-testid="view-cards"
        >
          {t('view.cards')}
        </Button>
      </Stack>
    </Stack>
  );
}
