// src/components/StickyTable/renderColumnFilter.tsx
import * as React from 'react';
import { MenuItem, Stack, Box, Slider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Column, Table } from '@tanstack/react-table';
import dayjs, { Dayjs } from 'dayjs';
import FormTextField from '../../components/FormTextField';

export type FilterVariant = 'text' | 'select' | 'number' | 'date';

/* ---------- Utils ---------- */

type NumRange = [number | undefined, number | undefined];

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Debounced effect without disabling exhaustive-deps */
function useDebouncedEffect(
  cb: () => void,
  deps: React.DependencyList,
  delay = 250,
) {
  const cbRef = React.useRef(cb);
  React.useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  React.useEffect(() => {
    const id = setTimeout(() => cbRef.current(), delay);
    return () => clearTimeout(id);
  }, [...deps, delay]);
}

// Infer the augmented meta type directly from the column
type MetaOf<C extends Column<any>> = NonNullable<C['columnDef']['meta']>;

/* ---------- Number Range Filter (inputs + slider) ---------- */

function NumberRangeFilter<T>({
  column,
  _table, // not needed here, keep to match signature
  meta,
  labelFrom = 'from',
  labelTo = 'to',
}: {
  column: Column<T, unknown>;
  _table: Table<T>;
  meta?: MetaOf<Column<T>>;
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

  // Current filter value from table state
  const current = (column.getFilterValue() as NumRange | undefined) ?? [
    undefined,
    undefined,
  ];

  // Local input state so typing doesn't re-filter on every keypress
  const [from, setFrom] = React.useState<number | ''>(current[0] ?? '');
  const [to, setTo] = React.useState<number | ''>(current[1] ?? '');

  // Keep local in sync if external filter changes (reset, etc.)
  React.useEffect(() => {
    const [c0, c1] = current;
    setFrom(c0 ?? '');
    setTo(c1 ?? '');
  }, [current]);

  // Debounced write-back to the column filter
  useDebouncedEffect(() => {
    const next: NumRange = [
      from === '' ? undefined : Number(from),
      to === '' ? undefined : Number(to),
    ];
    column.setFilterValue(next);
  }, [from, to, column]);

  // Slider needs concrete numbers → coerce to global bounds when missing
  const sliderValue: [number, number] = [
    typeof from === 'number' ? clamp(from, globalMin, globalMax) : globalMin,
    typeof to === 'number' ? clamp(to, globalMin, globalMax) : globalMax,
  ];

  return (
    <Stack spacing={1} direction="column" sx={{ minWidth: 80 }}>
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
  const meta = column.columnDef.meta as MetaOf<Column<T>> | undefined;
  const filterType: FilterVariant =
    (meta?.filterVariant as FilterVariant) ?? 'text';
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
        <NumberRangeFilter<T> column={column} _table={table} meta={meta} />
      );

    case 'date': {
      const [start, end] = Array.isArray(value) ? value : [null, null];

      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack
            direction="column"
            spacing={0.5}
            sx={{ width: 160 }} // 👈 set the width you want (e.g., 140–180)
          >
            <DatePicker
              label="from"
              value={start ? dayjs(start) : null}
              onChange={(val: Dayjs | null) =>
                column.setFilterValue([val?.toISOString() ?? null, end ?? null])
              }
              slotProps={{
                textField: {
                  variant: 'standard',
                  size: 'small',
                  fullWidth: false, // 👈 keep the input compact
                  sx: { width: '100%' }, // fill the 160px stack
                },
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
                textField: {
                  variant: 'standard',
                  size: 'small',
                  fullWidth: false, // 👈 compact
                  sx: { width: '100%' },
                },
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
