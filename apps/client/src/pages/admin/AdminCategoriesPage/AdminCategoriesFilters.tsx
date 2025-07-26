// AdminUsersPage/AdminUsersFilters.tsx

import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

interface Props {
  searchText: string;
  setSearchText: (val: string) => void;
  total: number;
}

export default function AdminCategoriesFilters({
  searchText,
  setSearchText,
  total,
}: Props) {
  return (
    <Box display="flex" flexDirection="column" gap={2} px={1} py={1}>
      <TextField
        label="Search by email"
        variant="outlined"
        size="small"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        fullWidth
      />
      <Typography variant="body2" color="text.secondary">
        Showing {total} users
      </Typography>
    </Box>
  );
}
