import React from 'react';
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  Button,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

interface Props {
  state: {
    searchTerm: string;
    status: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
  dispatch: React.Dispatch<
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'SET_DATE_FROM'; payload: string | null }
    | { type: 'SET_DATE_TO'; payload: string | null }
    | { type: 'SET_STATUS'; payload: string }
    | { type: 'RESET_FILTERS' }
  >;
}

const statusOptions = [
  '',
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
];

export default function UserOrderFilters({ state, dispatch }: Props) {
  const handleReset = () => dispatch({ type: 'RESET_FILTERS' });

  return (
    <Box>
      <Typography variant="subtitle2" mb={1}>
        Filter Orders
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Search by Order ID"
          value={state.searchTerm}
          onChange={(e) =>
            dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })
          }
          fullWidth
        />

        <TextField
          select
          label="Status"
          value={state.status}
          onChange={(e) =>
            dispatch({ type: 'SET_STATUS', payload: e.target.value })
          }
          fullWidth
        >
          {statusOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option
                ? option.charAt(0).toUpperCase() + option.slice(1)
                : 'All'}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label="Date From"
          value={state.dateFrom ? dayjs(state.dateFrom) : null}
          onChange={(newValue) =>
            dispatch({
              type: 'SET_DATE_FROM',
              payload: newValue ? newValue.toISOString() : null,
            })
          }
          slotProps={{ textField: { fullWidth: true } }}
        />

        <DatePicker
          label="Date To"
          value={state.dateTo ? dayjs(state.dateTo) : null}
          onChange={(newValue) =>
            dispatch({
              type: 'SET_DATE_TO',
              payload: newValue ? newValue.toISOString() : null,
            })
          }
          slotProps={{ textField: { fullWidth: true } }}
        />

        <Button variant="outlined" color="secondary" onClick={handleReset}>
          Reset Filters
        </Button>
      </Stack>
    </Box>
  );
}
