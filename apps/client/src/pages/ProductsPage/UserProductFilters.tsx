import React from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Category } from '../../types/firebase';
import { State as FilterState, Action as FilterAction } from './LocalReducer';

interface Props {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  categories: Category[];
}

export default function UserProductFilters({
  state,
  dispatch,
  categories,
}: Props) {
  return (
    <Box p={1}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={600}>
          Filters
        </Typography>

        <TextField
          label="Search"
          size="small"
          fullWidth
          value={state.search}
          onChange={(e) =>
            dispatch({ type: 'SET_SEARCH', payload: e.target.value })
          }
        />

        <TextField
          label="Min Price"
          type="number"
          size="small"
          fullWidth
          value={state.minPrice ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'SET_MIN_PRICE',
              payload: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />

        <TextField
          label="Max Price"
          type="number"
          size="small"
          fullWidth
          value={state.maxPrice ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'SET_MAX_PRICE',
              payload: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={state.inStockOnly}
              onChange={(e) =>
                dispatch({
                  type: 'SET_IN_STOCK_ONLY',
                  payload: e.target.checked,
                })
              }
            />
          }
          label="In Stock Only"
        />

        <TextField
          label="Category"
          size="small"
          fullWidth
          select
          value={state.selectedCategoryId}
          onChange={(e) =>
            dispatch({
              type: 'SET_CATEGORY',
              payload: e.target.value,
            })
          }
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label="Created After"
          value={state.createdAfter}
          onChange={(newValue: Dayjs | null) =>
            dispatch({ type: 'SET_CREATED_AFTER', payload: newValue })
          }
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </Stack>
    </Box>
  );
}
