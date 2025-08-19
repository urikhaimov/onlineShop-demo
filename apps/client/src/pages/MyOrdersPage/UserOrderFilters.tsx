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
import {
  useOrderFilterStore,
  ORDER_TOTAL_MIN,
  ORDER_TOTAL_MAX,
} from '../../stores/useOrderFilterStore';

export default function UserOrderFilters() {
  const {
    // state
    searchTerm,
    dateFrom,
    dateTo,
    status,
    minTotal,
    maxTotal,
    // setters
    setSearchTerm,
    setDateFrom,
    setDateTo,
    setStatus,
    setMinTotal,
    setMaxTotal,
    resetFilters,
  } = useOrderFilterStore();

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const onFromChange = (d: Dayjs | null) => {
    const next = d ? d.format('YYYY-MM-DD') : null;
    if (next && dateTo && next > dateTo) setDateTo(next);
    setDateFrom(next);
  };

  const onToChange = (d: Dayjs | null) => {
    const next = d ? d.format('YYYY-MM-DD') : null;
    if (next && dateFrom && next < dateFrom) setDateFrom(next);
    setDateTo(next);
  };

  const handleTotalChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinTotal(min);
    setMaxTotal(max);
  };

  return (
    <Stack spacing={2}>
      {/* Search */}
      <TextField
        label="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
        value={status}
        onChange={(e) => setStatus(e.target.value)}
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
          Total range: {currency(minTotal)} – {currency(maxTotal)}
        </Typography>
        <Slider
          value={[
            Math.max(ORDER_TOTAL_MIN, Math.min(minTotal, ORDER_TOTAL_MAX)),
            Math.max(ORDER_TOTAL_MIN, Math.min(maxTotal, ORDER_TOTAL_MAX)),
          ]}
          onChange={handleTotalChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => currency(v as number)}
          min={ORDER_TOTAL_MIN}
          max={ORDER_TOTAL_MAX}
          step={50}
          getAriaLabel={() => 'Total range'}
          marks={[
            { value: ORDER_TOTAL_MIN, label: currency(ORDER_TOTAL_MIN) },
            { value: ORDER_TOTAL_MAX, label: currency(ORDER_TOTAL_MAX) },
          ]}
        />
      </Box>

      {/* Footer */}
      <Box display="flex" justifyContent="flex-end">
        <Button onClick={resetFilters} variant="outlined" color="secondary">
          Reset Filters
        </Button>
      </Box>
    </Stack>
  );
}
