// src/pages/UserOrderFilters.tsx
import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Slider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useOrderFilterStore } from '../../stores/useOrderFilterStore';

const TOTAL_MIN = 0;
const TOTAL_MAX = 100000;

type Props = {
  /** called by parent (drawer) to close */
  onClose?: () => void;
  /** if true, will close after each committed change */
  closeOnChange?: boolean;
};

export default function UserOrderFilters({
  onClose,
  closeOnChange = false,
}: Props) {
  const {
    // state
    searchTerm,
    status,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    // setters
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

  // Keep the range valid while changing
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
  const handleTotalChangeCommitted = () => {
    maybeClose();
  };

  const handleReset = () => {
    resetFilters();
    maybeClose();
  };

  return (
    <Stack spacing={2}>
      {/* Search — don't close while typing; allow Enter to commit/close */}
      <TextField
        label="Search"
        value={searchTerm ?? ''}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') maybeClose();
        }}
        fullWidth
      />

      {/* Date range */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <DatePicker
          label="Date From"
          value={dateFrom ? dayjs(dateFrom) : null}
          onChange={onFromChange}
          slotProps={{ textField: { fullWidth: true } }}
        />
        <DatePicker
          label="Date To"
          value={dateTo ? dayjs(dateTo) : null}
          onChange={onToChange}
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Stack>

      {/* Status */}
      <TextField
        label="Status"
        select
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

      {/* Total ($) range */}
      <Box>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
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
          marks={[
            { value: TOTAL_MIN, label: currency(TOTAL_MIN) },
            { value: TOTAL_MAX, label: currency(TOTAL_MAX) },
          ]}
        />
      </Box>

      {/* Footer actions */}
      <Box display="flex" justifyContent="flex-end">
        <Button onClick={handleReset} variant="outlined" color="secondary">
          Reset Filters
        </Button>
      </Box>
    </Stack>
  );
}
