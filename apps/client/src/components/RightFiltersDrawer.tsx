// components/RightFiltersDrawer.tsx
import { Drawer, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function RightFiltersDrawer({
  title = 'Filters',
  open,
  onClose,
  children,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted
      ModalProps={{ keepMounted: true }} // ✅ prevents unmount on navigation
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
