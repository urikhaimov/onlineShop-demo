// src/components/tables/renderColumnFilter.tsx
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
  const filterType: FilterVariant = meta?.filterVariant || 'text';
  const value = column.getFilterValue();

  switch (filterType) {
    case 'select':
      return (
        <TextField
          select
          fullWidth
          variant="standard"
          value={value ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {meta?.selectOptions?.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      );

    case 'number':
      return (
        <TextField
          type="number"
          variant="standard"
          fullWidth
          value={value ?? ''}
          onChange={(e) =>
            column.setFilterValue(
              e.target.value === '' ? undefined : Number(e.target.value),
            )
          }
        />
      );

    case 'date': {
      const [start, end] = Array.isArray(value) ? value : [null, null];

      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="row" spacing={1}>
            <DatePicker
              label="From"
              value={start ? dayjs(start) : null}
              onChange={(val: Dayjs | null) =>
                column.setFilterValue([val?.toISOString() ?? null, end ?? null])
              }
              slotProps={{
                textField: { variant: 'standard', fullWidth: true },
              }}
            />
            <DatePicker
              label="To"
              value={end ? dayjs(end) : null}
              onChange={(val: Dayjs | null) =>
                column.setFilterValue([
                  start ?? null,
                  val?.toISOString() ?? null,
                ])
              }
              slotProps={{
                textField: { variant: 'standard', fullWidth: true },
              }}
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
          value={value ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder="Filter…"
        />
      );
  }
}
