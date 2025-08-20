// src/pages/UserOrderFilters.tsx
import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Slider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { useOrderFilterStore } from '../../stores/useOrderFilterStore';
import FiltersFooterActions from '../../components/FiltersFooterActions';

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
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

  const handleTotalChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinTotal(min);
    setMaxTotal(max);
  };
  const handleTotalChangeCommitted = () => maybeClose();

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
        label="Search"
        size="small"
        value={searchTerm ?? ''}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
        fullWidth
      />

      {/* Dates */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DatePicker
          label="Date From"
          value={dateFrom ? dayjs(dateFrom) : null}
          onChange={onFromChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label="Date To"
          value={dateTo ? dayjs(dateTo) : null}
          onChange={onToChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Stack>

      {/* Status */}
      <TextField
        label="Status"
        select
        size="small"
        value={status ?? ''}
        onChange={(e) => {
          setStatus(e.target.value || null);
          maybeClose();
        }}
        fullWidth
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="confirmed">Confirmed</MenuItem>
        <MenuItem value="shipped">Shipped</MenuItem>
        <MenuItem value="delivered">Delivered</MenuItem>
        <MenuItem value="cancelled">Cancelled</MenuItem>
      </TextField>

      {/* Total range */}
      <Box sx={{ px: { xs: 1, sm: 1.5 } }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
          Total range: {currency(minTotal ?? TOTAL_MIN)} –{' '}
          {currency(maxTotal ?? TOTAL_MAX)}
        </Typography>
        <Slider
          value={[
            Math.max(TOTAL_MIN, Math.min(minTotal ?? TOTAL_MIN, TOTAL_MAX)),
            Math.max(TOTAL_MIN, Math.min(maxTotal ?? TOTAL_MAX, TOTAL_MAX)),
          ]}
          onChange={handleTotalChange}
          onChangeCommitted={handleTotalChangeCommitted}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => currency(v as number)}
          min={TOTAL_MIN}
          max={TOTAL_MAX}
          step={50}
          getAriaLabel={() => 'Total range'}
          sx={{ mx: { xs: 0.5, sm: 1 } }}
          marks={[
            { value: TOTAL_MIN, label: currency(TOTAL_MIN) },
            { value: TOTAL_MAX, label: currency(TOTAL_MAX) },
          ]}
        />
      </Box>

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
