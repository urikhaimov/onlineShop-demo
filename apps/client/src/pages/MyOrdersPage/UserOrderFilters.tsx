import * as React from 'react';
import {
  TextField,
  MenuItem,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
// If you're already wrapping with LocalizationProvider+Dayjs adapter in AppProviders,
// the DatePicker will localize calendar UI automatically.
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { useOrderFilterStore } from '../../stores/useOrderFilterStore';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // show Apply on mobile by default

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
    // keep drawer open on reset (same behavior as products); call maybeClose() if you want auto-close
  };

  // Apply: blur active element (IME/keyboard) then close the drawer
  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.();
  }, [onClose]);

  return (
    <Stack spacing={2} sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
      {/* Search */}
      <TextField
        label={t('filters.search')}
        size="small"
        value={searchTerm ?? ''}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
        fullWidth
        placeholder={t('actions.searchPlaceholder')}
      />

      {/* Dates */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DatePicker
          label={t('filters.dateFrom')}
          value={dateFrom ? dayjs(dateFrom) : null}
          onChange={onFromChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label={t('filters.dateTo')}
          value={dateTo ? dayjs(dateTo) : null}
          onChange={onToChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
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
        value={[
          Math.max(TOTAL_MIN, Math.min(minTotal ?? TOTAL_MIN, TOTAL_MAX)),
          Math.max(TOTAL_MIN, Math.min(maxTotal ?? TOTAL_MAX, TOTAL_MAX)),
        ]}
        formatValue={currency}
        onChange={(min, max) => {
          setMinTotal(min);
          setMaxTotal(max);
        }}
        onCommit={maybeClose}
      />

      {/* Footer actions (reusable, same look/width/padding) */}
      <FiltersFooterActions
        onReset={handleReset}
        onApply={handleApply}
        showApply={isMobile} // only show on mobile and when we have a closer
        size="small"
        minButtonWidth={120}
      />
    </Stack>
  );
}
