import * as React from 'react';
import {
  Box,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { useOrderFilterStore } from '../../stores/useOrderFilterStore';
import { useThemeStore } from '../../stores/useThemeStore';
import FiltersFooterActions from '../../components/FiltersFooterActions';
import RangeFilterSlider from '../../components/RangeFilterSlider';
import { useTranslation } from 'react-i18next';

const TOTAL_MIN = 0;
const TOTAL_MAX = 100_000;

type Props = {
  onClose?: () => void; // drawer closer (used by Apply)
  closeOnChange?: boolean; // optional: auto-close after each change
};

export default function UserOrderFilters({
  onClose,
  closeOnChange = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const mui = useTheme();
  const isMobile = useMediaQuery(mui.breakpoints.down('sm'));

  // ---- Theme-aware rhythm (spacing/radius/shadows) ----
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);

  const gapUnit = Math.max(1, Math.round(2 * spacingScale));
  const gap = mui.spacing(gapUnit);

  const padX = {
    xs: mui.spacing(1.5 * spacingScale),
    sm: mui.spacing(2 * spacingScale),
  };
  const padY = {
    xs: mui.spacing(spacingScale),
    sm: mui.spacing(1.25 * spacingScale),
  };

  // ---- Store state ----
  const {
    searchTerm,
    status,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
    setMinTotal,
    setMaxTotal,
    resetFilters,
  } = useOrderFilterStore();

  // ---- Helpers ----
  const currency = (v: number) =>
    new Intl.NumberFormat((i18n.language || 'en').split('-')[0], {
      style: 'currency',
      currency: 'USD', // change if your store uses a different currency
      maximumFractionDigits: 0,
    }).format(v);

  const maybeClose = () => {
    if (closeOnChange && onClose) onClose();
  };

  const onFromChange = (d: Dayjs | null) => {
    const next = d ? d.format('YYYY-MM-DD') : null;
    if (next && dateTo && next > dateTo) setDateTo(next);
    setDateFrom(next);
    maybeClose();
  };

  const onToChange = (d: Dayjs | null) => {
    const next = d ? d.format('YYYY-MM-DD') : null;
    if (next && dateFrom && next < dateFrom) setDateFrom(next);
    setDateTo(next);
    maybeClose();
  };

  const handleReset = () => {
    resetFilters();
    // keep drawer open on reset; call maybeClose() if you want auto-close
  };

  // Apply: blur active element (IME/keyboard) then close the drawer
  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.();
  }, [onClose]);

  // Clamp slider values safely
  const sliderMin = Math.max(
    TOTAL_MIN,
    Math.min(minTotal ?? TOTAL_MIN, TOTAL_MAX),
  );
  const sliderMax = Math.max(
    TOTAL_MIN,
    Math.min(maxTotal ?? TOTAL_MAX, TOTAL_MAX),
  );

  return (
    <Box
      sx={{
        // Give the drawer content a soft card feel and theme spacing

        bgcolor: 'background.paper',
        boxSizing: 'border-box',
      }}
    >
      <Stack spacing={gap} sx={{ px: padX, py: padY }}>
        {/* Search */}
        <TextField
          label={t('filters.search')}
          size="small"
          type="search"
          value={searchTerm ?? ''}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
          fullWidth
          placeholder={t('actions.searchPlaceholder')}
          slotProps={{
            htmlInput: {
              inputMode: 'search',
              'aria-label': t('filters.search') as string,
            },
          }}
          autoComplete="off"
        />

        {/* Dates */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={gap}>
          <DatePicker
            label={t('filters.dateFrom')}
            value={dateFrom ? dayjs(dateFrom) : null}
            onChange={onFromChange}
            reduceAnimations={isMobile}
            slotProps={{
              textField: { fullWidth: true, size: 'small' },
              openPickerButton: { size: 'small' },
            }}
          />
          <DatePicker
            label={t('filters.dateTo')}
            value={dateTo ? dayjs(dateTo) : null}
            onChange={onToChange}
            reduceAnimations={isMobile}
            slotProps={{
              textField: { fullWidth: true, size: 'small' },
              openPickerButton: { size: 'small' },
            }}
          />
        </Stack>

        {/* Status */}
        <TextField
          label={t('filters.status')}
          select
          size="small"
          value={status ?? ''}
          onChange={(e) => {
            setStatus(e.target.value || null);
            maybeClose();
          }}
          fullWidth
        >
          <MenuItem value="">{t('filters.all')}</MenuItem>
          <MenuItem value="pending">{t('orders.status.pending')}</MenuItem>
          <MenuItem value="confirmed">{t('orders.status.confirmed')}</MenuItem>
          <MenuItem value="shipped">{t('orders.status.shipped')}</MenuItem>
          <MenuItem value="delivered">{t('orders.status.delivered')}</MenuItem>
          <MenuItem value="cancelled">{t('orders.status.cancelled')}</MenuItem>
        </TextField>

        {/* Total range */}
        <RangeFilterSlider
          label={t('filters.totalRange')}
          min={TOTAL_MIN}
          max={TOTAL_MAX}
          step={50}
          value={[sliderMin, sliderMax]}
          formatValue={currency}
          onChange={(min, max) => {
            setMinTotal(min);
            setMaxTotal(max);
          }}
          onCommit={maybeClose}
        />
      </Stack>

      {/* Footer actions (sticky within drawer, consistent spacing) */}
      <Box sx={{ px: padX, pb: padY }}>
        <FiltersFooterActions
          onReset={handleReset}
          onApply={handleApply}
          showApply={isMobile} // show explicit Apply on mobile
          size="small"
          minButtonWidth={120}
        />
      </Box>
    </Box>
  );
}
