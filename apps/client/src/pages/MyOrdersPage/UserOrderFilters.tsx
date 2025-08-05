// src/pages/UserOrderFilters.tsx
import React from 'react';
import { Box, TextField, MenuItem, Button, Stack } from '@mui/material';
import { useOrderFilterStore } from '../../stores/useOrderFilterStore';

export default function UserOrderFilters() {
  const {
    searchTerm,
    dateFrom,
    dateTo,
    status,
    setSearchTerm,
    setDateFrom,
    setDateTo,
    setStatus,
    resetFilters,
  } = useOrderFilterStore();

  return (
    <Stack spacing={2}>
      <TextField
        label="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
      />

      <TextField
        label="Date From"
        type="date"
        value={dateFrom ?? ''}
        onChange={(e) => setDateFrom(e.target.value || null)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />

      <TextField
        label="Date To"
        type="date"
        value={dateTo ?? ''}
        onChange={(e) => setDateTo(e.target.value || null)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />

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
      </TextField>

      <Box display="flex" justifyContent="flex-end">
        <Button onClick={resetFilters} variant="outlined" color="secondary">
          Reset Filters
        </Button>
      </Box>
    </Stack>
  );
}
