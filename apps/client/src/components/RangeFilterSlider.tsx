import * as React from 'react';
import { Box, Slider, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type Range = [number, number];

export type RangeFilterSliderProps = {
  /** Caption label shown above the slider, e.g. "Price range" */
  label: string;
  /** Inclusive minimum and maximum values */
  min: number;
  max: number;
  /** Controlled value as [min, max] */
  value: Range;
  /** Step size (defaults to 1) */
  step?: number;
  /** Called whenever the slider thumbs move */
  onChange: (min: number, max: number) => void;
  /** Called on commit (mouseup / touchend) */
  onCommit?: () => void;
  /** Format a number for UI (e.g., currency) */
  formatValue?: (v: number) => string;
  /** ARIA label for accessibility (defaults to `label`) */
  ariaLabel?: string;
  /** Custom marks; pass `false` to hide; `true`/undefined to auto min/max */
  marks?: false | { value: number; label: string }[];
  /** Slider value label display (defaults to 'auto') */
  valueLabelDisplay?: 'auto' | 'on' | 'off';
  /** Extra sx for the Slider itself */
  sx?: SxProps<Theme>;
  /** Extra sx for the container Box */
  containerSx?: SxProps<Theme>;
  disabled?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

export default function RangeFilterSlider({
  label,
  min,
  max,
  value,
  step = 1,
  onChange,
  onCommit,
  formatValue,
  ariaLabel,
  marks,
  valueLabelDisplay = 'auto',
  sx,
  containerSx,
  disabled,
}: RangeFilterSliderProps) {
  const fmt = React.useCallback(
    (v: number) =>
      formatValue
        ? formatValue(v)
        : v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    [formatValue],
  );

  // Defensive clamp (in case parent passes slightly out-of-bounds values)
  const clamped: Range = [clamp(value[0], min, max), clamp(value[1], min, max)];

  const computedMarks =
    marks === false
      ? undefined
      : (marks ?? [
          { value: min, label: fmt(min) },
          { value: max, label: fmt(max) },
        ]);

  return (
    <Box sx={{ px: { xs: 1, sm: 1.5 }, ...containerSx }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
        {label}: {fmt(clamped[0])} – {fmt(clamped[1])}
      </Typography>

      <Slider
        value={clamped}
        onChange={(_, v) => {
          if (Array.isArray(v)) onChange(v[0] as number, v[1] as number);
        }}
        onChangeCommitted={onCommit}
        valueLabelDisplay={valueLabelDisplay}
        valueLabelFormat={(v) => fmt(v as number)}
        min={min}
        max={max}
        step={step}
        getAriaLabel={() => ariaLabel ?? label}
        sx={{ mx: { xs: 0.5, sm: 1 }, ...sx }}
        marks={computedMarks}
        disabled={disabled}
      />
    </Box>
  );
}
