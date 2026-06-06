import * as React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { isDemoAdmin } from '../lib/demo-mode';

/**
 * Fixed-position badge shown in the admin layout when demo mode is active.
 * Renders nothing in production or when VITE_DEMO_ADMIN is not set.
 */
export const DemoModeBadge: React.FC = () => {
  if (!isDemoAdmin()) return null;

  return (
    <Tooltip title="Running with a synthetic admin user — no real Firebase session. Dev builds only.">
      <Chip
        label="DEMO MODE"
        size="small"
        color="warning"
        sx={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 9999,
          fontWeight: 700,
          letterSpacing: '0.08em',
          fontSize: '0.7rem',
          cursor: 'default',
          pointerEvents: 'auto',
        }}
      />
    </Tooltip>
  );
};
