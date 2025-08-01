// src/components/tables/renderColumnFilter.tsx

import React from 'react';
import { TextField, MenuItem, Stack } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Column, Table } from '@tanstack/react-table';
import dayjs, { Dayjs } from 'dayjs';

type FilterType = 'text' | 'select' | 'number' | 'date-range';

interface ColumnMeta {
  filterType?: FilterType;
  selectOptions?: string[];
}

// We cast column.columnDef.meta to ColumnMeta so TypeScript understands our structure
export function renderColumnFilter<T>(
  column: Column<T, unknown>,
  table: Table<T>,
) {
  const meta = column.columnDef.meta as ColumnMeta | undefined;
  const filterType: FilterType = meta?.filterType || 'text';
  const value = column.getFilterValue();

  switch (filterType) {
    case 'select': {
      const options: string[] = meta?.selectOptions || [];
      return (
        <TextField
          select
          fullWidth
          variant="standard"
          value={(value ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    case 'number':
      return (
        <TextField
          type="number"
          variant="standard"
          fullWidth
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            column.setFilterValue(val === '' ? undefined : Number(val));
          }}
        />
      );

    case 'date-range': {
      const [start, end] = Array.isArray(value) ? value : [null, null];

      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="row" spacing={1}>
            <DatePicker
              value={start ? dayjs(start) : null}
              onChange={(newVal: Dayjs | null) => {
                column.setFilterValue([
                  newVal?.toISOString() ?? null,
                  end ?? null,
                ]);
              }}
              slotProps={{
                textField: { variant: 'standard', fullWidth: true },
              }}
              label="From"
            />
            <DatePicker
              value={end ? dayjs(end) : null}
              onChange={(newVal: Dayjs | null) => {
                column.setFilterValue([
                  start ?? null,
                  newVal?.toISOString() ?? null,
                ]);
              }}
              slotProps={{
                textField: { variant: 'standard', fullWidth: true },
              }}
              label="To"
            />
          </Stack>
        </LocalizationProvider>
      );
    }

    case 'text':
    default:
      return (
        <TextField
          variant="standard"
          fullWidth
          value={(value ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder="Filter…"
        />
      );
  }
}
