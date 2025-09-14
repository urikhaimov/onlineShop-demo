// src/pages/MyOrders/UserOrderFilters.tsx
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
import { ECurrency } from '@common/types';
import { formatCurrency } from '@common/utils';

const TOTAL_MIN = 0;
const TOTAL_MAX = 100_000;

type Props = {
  onClose?: () => void;
  closeOnChange?: boolean;
};

export default function UserOrderFilters({
  onClose,
  closeOnChange = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const mui = useTheme();
  const isMobile = useMediaQuery(mui.breakpoints.down('sm'));

  // Theme rhythm
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
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

  // Store state
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

  const currency = (v: number) =>
    formatCurrency(v, ECurrency.ILS, i18n.language);
  const maybeClose = () => closeOnChange && onClose?.();

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
  };

  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.();
  }, [onClose]);

  // ---- Debounced search (fixes test expecting q === "ORD-0005") ----
  // Keep a local input mirror so keystrokes don't immediately hit the store/API.
  const [searchLocal, setSearchLocal] = React.useState(searchTerm ?? '');

  // If store changes externally (e.g., reset), keep input in sync.
  React.useEffect(() => {
    setSearchLocal(searchTerm ?? '');
  }, [searchTerm]);

  // Debounce: apply to store after user stops typing.
  React.useEffect(() => {
    const trimmed = searchLocal.trim();
    const t = setTimeout(() => {
      setSearchTerm(trimmed);
      if (trimmed && closeOnChange) onClose?.();
    }, 180); // small trailing debounce
    return () => clearTimeout(t);
  }, [searchLocal, setSearchTerm, closeOnChange, onClose]);

  // Clamp slider values
  const sliderMin = Math.max(
    TOTAL_MIN,
    Math.min(minTotal ?? TOTAL_MIN, TOTAL_MAX),
  );
  const sliderMax = Math.max(
    TOTAL_MIN,
    Math.min(maxTotal ?? TOTAL_MAX, TOTAL_MAX),
  );

  return (
    <Box sx={{ bgcolor: 'background.paper', boxSizing: 'border-box' }}>
      <Stack spacing={gap} sx={{ px: padX, py: padY }}>
        {/* Search */}
        <TextField
          label={t('filters.search', { defaultValue: 'Search' })}
          size="small"
          type="search"
          value={searchLocal}
          onChange={(e) => setSearchLocal((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = searchLocal.trim();
              setSearchTerm(v); // flush immediately on Enter
              if (v && closeOnChange) onClose?.();
              (document.activeElement as HTMLElement | null)?.blur?.();
            }
          }}
          fullWidth
          placeholder={t('actions.searchPlaceholder', {
            defaultValue: 'Search orders…',
          })}
          inputProps={{
            inputMode: 'search',
            'aria-label': t('filters.search', {
              defaultValue: 'Search',
            }) as string,
            'data-testid': 'orders-search',
          }}
          autoComplete="off"
        />

        {/* Dates */}
        {/* Dates */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={gap}>
          <DatePicker
            label={t('filters.dateFrom', { defaultValue: 'From date' })}
            value={dateFrom ? dayjs(dateFrom) : null}
            onChange={(value: Dayjs | null, _ctx) => onFromChange(value)}
            reduceAnimations={isMobile}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                inputProps: {
                  'aria-label': t('filters.dateFrom', {
                    defaultValue: 'From date',
                  }) as string,
                },
              },
              openPickerButton: { size: 'small' },
            }}
          />
          <DatePicker
            label={t('filters.dateTo', { defaultValue: 'To date' })}
            value={dateTo ? dayjs(dateTo) : null}
            onChange={(value: Dayjs | null, _ctx) => onToChange(value)}
            reduceAnimations={isMobile}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                inputProps: {
                  'aria-label': t('filters.dateTo', {
                    defaultValue: 'To date',
                  }) as string,
                },
              },
              openPickerButton: { size: 'small' },
            }}
          />
        </Stack>

        {/* Status */}
        <TextField
          label={t('filters.status', { defaultValue: 'Status' })}
          select
          size="small"
          value={status ?? ''}
          onChange={(e) => {
            setStatus(e.target.value || null);
            maybeClose();
          }}
          fullWidth
          inputProps={{
            'aria-label': t('filters.status', {
              defaultValue: 'Status',
            }) as string,
          }}
        >
          <MenuItem value="">
            {t('filters.all', { defaultValue: 'All' })}
          </MenuItem>
          <MenuItem value="pending">
            {t('orders.status.pending', { defaultValue: 'Pending' })}
          </MenuItem>
          <MenuItem value="confirmed">
            {t('orders.status.confirmed', { defaultValue: 'Confirmed' })}
          </MenuItem>
          <MenuItem value="shipped">
            {t('orders.status.shipped', { defaultValue: 'Shipped' })}
          </MenuItem>
          <MenuItem value="delivered">
            {t('orders.status.delivered', { defaultValue: 'Delivered' })}
          </MenuItem>
          <MenuItem value="cancelled">
            {t('orders.status.cancelled', { defaultValue: 'Cancelled' })}
          </MenuItem>
        </TextField>

        {/* Total range */}
        <RangeFilterSlider
          label={t('filters.totalRange', { defaultValue: 'Total range' })}
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

      <Box sx={{ px: padX, pb: padY }}>
        <FiltersFooterActions
          onReset={handleReset}
          onApply={handleApply}
          showApply={isMobile}
          size="small"
          minButtonWidth={120}
        />
      </Box>
    </Box>
  );
}
