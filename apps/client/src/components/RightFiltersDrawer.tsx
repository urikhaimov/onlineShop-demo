// components/RightFiltersDrawer.tsx
import { Drawer, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { DrawerProps } from '@mui/material/Drawer';

type Props = {
  title?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Pass-through to MUI Drawer ModalProps (e.g., { keepMounted: true, disablePortal: true }) */
  ModalProps?: DrawerProps['ModalProps'];
  /** Pass-through to MUI Drawer PaperProps (e.g., { role: 'dialog' }) */
  PaperProps?: DrawerProps['PaperProps'];
};

export default function RightFiltersDrawer({
  title = 'Filters',
  open,
  onClose,
  children,
  ModalProps,
  PaperProps,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // keepMounted avoids unmounting on route changes; allow user overrides via ModalProps
      keepMounted
      ModalProps={{ keepMounted: true, ...(ModalProps ?? {}) }}
      PaperProps={PaperProps}
    >
      <Box sx={{ width: { xs: 320, sm: 360 }, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Drawer>
  );
}
