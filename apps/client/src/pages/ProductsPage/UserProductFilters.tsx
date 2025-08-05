import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Slider,
} from '@mui/material';
import { Dayjs } from 'dayjs';
import { TCategory as Category } from '@common/types';
import { Action } from './LocalReducer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  filters: {
    searchTerm: string;
    selectedCategoryId: string;
    createdAfter: Dayjs | null;
    minPrice: number;
    maxPrice: number;
  };
  dispatch: React.Dispatch<Action>;
  categories: Category[];
}

export default function UserProductFilters({
  filters,
  dispatch,
  categories,
}: Props) {
  const handleReset = () => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: '' });
    dispatch({ type: 'SET_CREATED_AFTER', payload: null });
    dispatch({ type: 'SET_MIN_PRICE', payload: 0 });
    dispatch({ type: 'SET_MAX_PRICE', payload: 10000 });
  };

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          label="Search"
          value={filters.searchTerm}
          onChange={(e) =>
            dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })
          }
          fullWidth
        />

        <TextField
          label="Category"
          select
          value={filters.selectedCategoryId}
          onChange={(e) =>
            dispatch({ type: 'SET_CATEGORY_FILTER', payload: e.target.value })
          }
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
          value={filters.createdAfter}
          onChange={(newValue) =>
            dispatch({ type: 'SET_CREATED_AFTER', payload: newValue })
          }
          slotProps={{ textField: { fullWidth: true } }}
        />

        <Box>
          <Typography variant="body2" gutterBottom>
            Price Range
          </Typography>
          <Slider
            value={[filters.minPrice, filters.maxPrice]}
            min={0}
            max={10000}
            onChange={(_, [min, max]) => {
              dispatch({ type: 'SET_MIN_PRICE', payload: min });
              dispatch({ type: 'SET_MAX_PRICE', payload: max });
            }}
            valueLabelDisplay="auto"
          />
        </Box>

        <Button onClick={handleReset} color="secondary" variant="outlined">
          Reset Filters
        </Button>
      </Stack>
    </Box>
  );
}
