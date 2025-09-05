import * as React from 'react';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
} from '@mui/material';
import { useBackgroundStore } from '../../stores/useBackgroundStore';
type Variant = 'aurora' | 'mesh' | 'shimmer' | 'bokeh' | 'rays' | 'stripes';

const LABEL: Record<Variant, string> = {
  aurora: 'Aurora',
  mesh: 'Mesh gradient',
  shimmer: 'Shimmer',
  bokeh: 'Bokeh',
  rays: 'Rays',
  stripes: 'Stripes',
};

export default function BackgroundModeControl() {
  const enabled = useBackgroundStore((s) => s.enabled);
  const variant = useBackgroundStore((s) => s.variant);
  const setVariant = useBackgroundStore((s) => s.setVariant);
  const toggle = useBackgroundStore((s) => s.toggle);

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="bg-variant-label">Background</InputLabel>
        <Select
          labelId="bg-variant-label"
          label="Background"
          value={variant}
          onChange={(e) => setVariant(e.target.value as Variant)}
          disabled={!enabled}
        >
          {(Object.keys(LABEL) as Variant[]).map((k) => (
            <MenuItem key={k} value={k}>
              {LABEL[k]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="caption">Off</Typography>
        <Switch checked={enabled} onChange={toggle} size="small" />
        <Typography variant="caption">On</Typography>
      </Stack>
    </Stack>
  );
}
