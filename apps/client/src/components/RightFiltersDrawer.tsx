import * as React from 'react';
import {
  Drawer,
  Box,
  Stack,
  Typography,
  IconButton,
  type SxProps,
  type Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  title?: string;
  open: boolean;
  onClose: () => void;
  width?: number;
  sx?: SxProps<Theme>;
  children: React.ReactNode;
};

export default function RightFiltersDrawer({
  title = 'Filters',
  open,
  onClose,
  width = 360,
  sx,
  children,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: width }, ...sx } }}
    >
      <Box p={2}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>
        {children}
      </Box>
    </Drawer>
  );
}
