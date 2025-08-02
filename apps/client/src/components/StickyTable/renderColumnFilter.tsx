import React from 'react';
import { TextField, MenuItem, Stack } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Column, Table } from '@tanstack/react-table';
import dayjs, { Dayjs } from 'dayjs';

type FilterVariant = 'text' | 'select' | 'number' | 'date';

interface ColumnMeta {
  filterVariant?: FilterVariant;
  selectOptions?: string[];
}

export function renderColumnFilter<T>(
  column: Column<T, unknown>,
  table: Table<T>,
) {
  const meta = column.columnDef.meta as ColumnMeta | undefined;
  const variant: FilterVariant = meta?.filterVariant ?? 'text';
  const value = column.getFilterValue();

  switch (variant) {
    case 'select': {
      const options = meta?.selectOptions ?? [];
      return (
        <TextField
          select
          fullWidth
          variant="standard"
          value={(value ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
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

    case 'date':
      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={value ? dayjs(value as string) : null}
            onChange={(newVal: Dayjs | null) => {
              column.setFilterValue(newVal ? newVal.toISOString() : undefined);
            }}
            slotProps={{
              textField: {
                variant: 'standard',
                fullWidth: true,
              },
            }}
          />
        </LocalizationProvider>
      );

    case 'text':
    default:
      return (
        <TextField
          variant="standard"
          fullWidth
          value={(value ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          placeholder="Filter…"
        />
      );
  }
}
