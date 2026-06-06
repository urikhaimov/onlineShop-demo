// src/components/BackgroundModeControl.tsx
import * as React from 'react';
import {
  Stack,
  Typography,
  Switch,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded';
import WbIridescentRoundedIcon from '@mui/icons-material/WbIridescentRounded';
import FlareRoundedIcon from '@mui/icons-material/FlareRounded';
import ViewStreamRoundedIcon from '@mui/icons-material/ViewStreamRounded';

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

const VARIANT_ICON: Record<Variant, React.ReactNode> = {
  aurora: <AutoAwesomeIcon />,
  mesh: <GridOnRoundedIcon />,
  shimmer: <WbIridescentRoundedIcon />,
  bokeh: <BlurOnRoundedIcon />,
  rays: <FlareRoundedIcon />,
  stripes: <ViewStreamRoundedIcon />,
};

export default function BackgroundModeControl() {
  const enabled = useBackgroundStore((s) => s.enabled);
  const variant = useBackgroundStore((s) => s.variant as Variant);
  const setVariant = useBackgroundStore((s) => s.setVariant);
  const toggle = useBackgroundStore((s) => s.toggle);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (v: Variant) => {
    setVariant(v);
    handleClose();
  };

  const title = enabled ? `Background: ${LABEL[variant]}` : 'Background: Off';

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {/* IconButton as the "select" trigger */}
      <Tooltip title={title}>
        <span>
          {/* span wrapper so disabled still shows tooltip */}
          <IconButton
            aria-label="Choose background effect"
            aria-haspopup="menu"
            aria-controls={open ? 'bg-variant-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            onClick={handleOpen}
            size="small"
            disableRipple
            disabled={!enabled}
          >
            {enabled ? VARIANT_ICON[variant] : <AutoAwesomeOutlinedIcon />}
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        id="bg-variant-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {(Object.keys(LABEL) as Variant[]).map((k) => (
          <MenuItem
            key={k}
            selected={k === variant}
            onClick={() => handleSelect(k)}
          >
            <ListItemIcon>{VARIANT_ICON[k]}</ListItemIcon>
            <ListItemText>{LABEL[k]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Text labels hidden on narrow screens to save header space */}
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography
          variant="caption"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          Off
        </Typography>
        <Switch checked={enabled} onChange={toggle} size="small" />
        <Typography
          variant="caption"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          On
        </Typography>
      </Stack>
    </Stack>
  );
}
