// src/pages/UserProductFilters.tsx
import React from 'react';
import { Box, TextField, MenuItem, Button, Stack } from '@mui/material';
import { TCategory } from '@common/types';
import { useProductStore } from '../../stores/useProductStore';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  categories: TCategory[];
}

export default function UserProductFilters({ categories }: Props) {
  const {
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    setSearchTerm,
    setSelectedCategoryId,
    setCreatedAfter,
    setMinPrice,
    setMaxPrice,
  } = useProductStore();

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setCreatedAfter(null);
    setMinPrice(0);
    setMaxPrice(10000);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
      />

      <TextField
        label="Category"
        select
        value={selectedCategoryId}
        onChange={(e) => setSelectedCategoryId(e.target.value)}
        fullWidth
      >
        <MenuItem value="">All</MenuItem>
        {categories.map((cat) => (
          <MenuItem key={cat.id} value={cat.id}>
            {cat.name}
          </MenuItem>
        ))}
      </TextField>

      <DatePicker
        label="Created After"
        value={createdAfter}
        onChange={(newValue: Dayjs | null) => setCreatedAfter(newValue)}
        slotProps={{
          textField: { fullWidth: true },
        }}
      />

      <TextField
        label="Min Price"
        type="number"
        value={minPrice}
        onChange={(e) => setMinPrice(Number(e.target.value))}
        fullWidth
      />

      <TextField
        label="Max Price"
        type="number"
        value={maxPrice}
        onChange={(e) => setMaxPrice(Number(e.target.value))}
        fullWidth
      />

      <Box display="flex" justifyContent="flex-end">
        <Button onClick={handleReset} variant="outlined" color="secondary">
          Reset Filters
        </Button>
      </Box>
    </Stack>
  );
}
