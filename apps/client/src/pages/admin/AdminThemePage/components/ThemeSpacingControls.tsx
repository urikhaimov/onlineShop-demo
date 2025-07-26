import { type Control, Controller } from 'react-hook-form'; // ✅ Combined import
import { Slider, Stack, Typography } from '@mui/material';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  control: Control<ThemeSettings>;
}

export default function ThemeSpacingControls({ control }: Props) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">Spacing Scale</Typography>
      <Controller
        name="spacingScale"
        control={control}
        render={({ field }) => (
          <Slider
            {...field}
            value={field.value ?? 2}
            min={1}
            max={8}
            step={0.5}
            marks
            valueLabelDisplay="auto"
          />
        )}
      />

      <Typography variant="subtitle1">Border Radius</Typography>
      <Controller
        name="borderRadius"
        control={control}
        render={({ field }) => (
          <Slider
            {...field}
            value={field.value ?? 4}
            min={0}
            max={32}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        )}
      />
    </Stack>
  );
}
