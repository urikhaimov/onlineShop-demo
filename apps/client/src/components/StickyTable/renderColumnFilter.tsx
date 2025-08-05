import React from 'react';
import { MenuItem, Stack } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Column, Table } from '@tanstack/react-table';
import dayjs, { Dayjs } from 'dayjs';
import FormTextField from '../../components/FormTextField'; // adjust path as needed

/**
 * Filter variant types
 */
type FilterVariant = 'text' | 'select' | 'number' | 'date';
type SelectOptions = { label: string; value: string };

interface ColumnMeta {
  filterVariant?: FilterVariant;
  selectOptions?: SelectOptions[];
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
        <FormTextField
          label=""
          select
          variant="standard"
          value={value ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value)}
        >
          {(meta?.selectOptions ?? []).map(({ label, value }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </FormTextField>
      );

    case 'number': {
      const [min, max] = Array.isArray(value) ? value : [null, null];
      return (
        <Stack direction="column" spacing={1}>
          <FormTextField
            type="number"
            label="From"
            variant="standard"
            value={min ?? ''}
            onChange={(e) =>
              column.setFilterValue([
                e.target.value === '' ? null : Number(e.target.value),
                max ?? null,
              ])
            }
            sx={{ flex: 1 }}
          />
          <FormTextField
            type="number"
            label="To"
            variant="standard"
            value={max ?? ''}
            onChange={(e) =>
              column.setFilterValue([
                min ?? null,
                e.target.value === '' ? null : Number(e.target.value),
              ])
            }
            sx={{ flex: 1 }}
          />
        </Stack>
      );
    }

    case 'date': {
      const [start, end] = Array.isArray(value) ? value : [null, null];
      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="column" spacing={1}>
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
        <FormTextField
          label={''}
          variant="standard"
          value={value ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder="Filter…"
        />
      );
  }
}
