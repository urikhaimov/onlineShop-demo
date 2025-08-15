// src/components/StickyTable/renderColumnFilter.tsx
import * as React from 'react';
import { MenuItem, Stack, Box, Slider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Column, Table } from '@tanstack/react-table';
import dayjs, { Dayjs } from 'dayjs';
import FormTextField from '../../../components/FormTextField';

export type FilterVariant = 'text' | 'select' | 'number' | 'date';
type SelectOptions = { label: string; value: string };

export interface ColumnMeta {
  align?: 'left' | 'center' | 'right';
  filterVariant?: FilterVariant;
  selectOptions?: readonly SelectOptions[];
  sticky?: 'left' | 'right';
  hiddenOnMobile?: boolean;
  /** Configure numeric range filter bounds & step */
  numberRange?: { min?: number; max?: number; step?: number };
}

/* ---------- Helpers ---------- */

type NumRange = [number | undefined, number | undefined];

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function useDebouncedEffect(
  effect: () => void,
  deps: React.DependencyList,
  delay = 250,
) {
  React.useEffect(() => {
    const id = setTimeout(effect, delay);
    return () => clearTimeout(id);
  }, deps);
}

/* ---------- Number Range Filter (inputs + slider) ---------- */

function NumberRangeFilter<T>({
  column,
  table,
  meta,
  labelFrom = 'From',
  labelTo = 'To',
}: {
  column: Column<T, unknown>;
  table: Table<T>;
  meta?: ColumnMeta;
  labelFrom?: string;
  labelTo?: string;
}) {
  // Preferred: explicit bounds from column meta
  const explicitMin = meta?.numberRange?.min;
  const explicitMax = meta?.numberRange?.max;
  const explicitStep = meta?.numberRange?.step ?? 1;

  // Otherwise: derive from faceted values (TanStack), then fall back to 0..100000
  const faceted = column.getFacetedMinMaxValues?.();
  const globalMin =
    explicitMin ?? (typeof faceted?.[0] === 'number' ? faceted[0] : 0);
  const globalMax =
    explicitMax ?? (typeof faceted?.[1] === 'number' ? faceted[1] : 100000);

  const current = (column.getFilterValue() as NumRange | undefined) ?? [
    undefined,
    undefined,
  ];

  // Local input state so typing doesn't re-filter on every keypress
  const [from, setFrom] = React.useState<number | ''>(current[0] ?? '');
  const [to, setTo] = React.useState<number | ''>(current[1] ?? '');

  // Sync local state if external filter is cleared/changed
  React.useEffect(() => {
    setFrom(current[0] ?? '');
    setTo(current[1] ?? '');
  }, [current?.[0], current?.[1]]);

  // Debounced write-back to table filter
  useDebouncedEffect(() => {
    const next: NumRange = [
      from === '' ? undefined : Number(from),
      to === '' ? undefined : Number(to),
    ];
    column.setFilterValue(next);
  }, [from, to, column]);

  // Slider needs definite numbers → coerce to bounds when missing
  const sliderValue: [number, number] = [
    typeof from === 'number' ? clamp(from, globalMin, globalMax) : globalMin,
    typeof to === 'number' ? clamp(to, globalMin, globalMax) : globalMax,
  ];

  return (
    <Stack spacing={1} direction="column" sx={{ minWidth: 180 }}>
      <Stack direction="row" spacing={1}>
        <FormTextField
          type="number"
          label={labelFrom}
          variant="standard"
          value={from}
          onChange={(e) => {
            const v = e.target.value;
            setFrom(v === '' ? '' : Number(v));
          }}
          inputProps={{
            inputMode: 'numeric',
            min: globalMin,
            max: globalMax,
            step: explicitStep,
          }}
          sx={{ flex: 1 }}
        />
        <FormTextField
          type="number"
          label={labelTo}
          variant="standard"
          value={to}
          onChange={(e) => {
            const v = e.target.value;
            setTo(v === '' ? '' : Number(v));
          }}
          inputProps={{
            inputMode: 'numeric',
            min: globalMin,
            max: globalMax,
            step: explicitStep,
          }}
          sx={{ flex: 1 }}
        />
      </Stack>

      <Box px={0.5}>
        <Slider
          value={sliderValue}
          min={globalMin}
          max={globalMax}
          step={explicitStep}
          onChange={(_, next) => {
            const [lo, hi] = next as [number, number];
            setFrom(lo);
            setTo(hi);
          }}
          valueLabelDisplay="auto"
          disableSwap
          sx={{ '& .MuiSlider-thumb': { width: 16, height: 16 } }}
        />
      </Box>
    </Stack>
  );
}

/* ---------- Main renderer ---------- */

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

    case 'number':
      return (
        <NumberRangeFilter<T>
          column={column}
          table={table}
          meta={meta}
          // Hebrew labels like your screenshot:
          labelFrom="החל מ-"
          labelTo="עד"
        />
      );

    case 'date': {
      // Expecting [from, to] ISO strings for your betweenDateRange
      const [start, end] = (Array.isArray(value) ? value : [null, null]) as
        | [string | null, string | null]
        | [null, null];

      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="column" spacing={1}>
            <DatePicker
              label="from"
              value={start ? dayjs(start) : null}
              onChange={(val: Dayjs | null) =>
                column.setFilterValue([val?.toISOString() ?? null, end ?? null])
              }
              slotProps={{
                textField: { variant: 'standard', fullWidth: true },
              }}
            />
            <DatePicker
              label="to"
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
          label=""
          variant="standard"
          value={value ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder="Filter…"
        />
      );
  }
}
