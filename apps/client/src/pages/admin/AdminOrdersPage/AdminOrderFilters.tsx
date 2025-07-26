import React from 'react';
import { Box, Fab, Stack, useMediaQuery, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import dayjs, { Dayjs } from 'dayjs';

import { FilterState, FilterAction } from './LocalReducer';
import AdminFilterLayout from '../../../components/AdminFilterLayout';
import UserFilterTextField from '../../../components/UserFilterTextField';
import UserFilterDatePicker from '../../../components/UserFilterDatePicker';

const statusOptions = ['all', 'pending', 'shipped', 'delivered', 'succeeded'];

interface Props {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
}

export default function AdminOrderFilters({ state, dispatch }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasFilters = Boolean(
    state.email ||
      state.status !== 'all' ||
      state.minTotal ||
      state.maxTotal ||
      state.minPrice ||
      state.maxPrice ||
      state.startDate ||
      state.endDate ||
      state.inStockOnly,
  );

  const parseNumber = (val: string): number | undefined => {
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  };

  return (
    <>
      <Box pr={1}>
        <Stack spacing={2}>
          <UserFilterTextField
            label="User Email"
            value={state.email}
            onChange={(val) => dispatch({ type: 'setEmail', payload: val })}
            fullWidth
          />
          <UserFilterTextField
            label="Status"
            select
            value={state.status}
            onChange={(val) => dispatch({ type: 'setStatus', payload: val })}
            options={statusOptions.map((s) => ({ value: s, label: s }))}
            fullWidth
          />
          <UserFilterTextField
            label="Min Total"
            type="number"
            value={state.minTotal?.toString() || ''}
            onChange={(val) =>
              dispatch({ type: 'setMinTotal', payload: parseNumber(val) })
            }
            fullWidth
          />
          <UserFilterTextField
            label="Max Total"
            type="number"
            value={state.maxTotal?.toString() || ''}
            onChange={(val) =>
              dispatch({ type: 'setMaxTotal', payload: parseNumber(val) })
            }
            fullWidth
          />
          <UserFilterTextField
            label="Min Price"
            type="number"
            value={state.minPrice?.toString() || ''}
            onChange={(val) =>
              dispatch({ type: 'setMinPrice', payload: parseNumber(val) })
            }
            fullWidth
          />
          <UserFilterTextField
            label="Max Price"
            type="number"
            value={state.maxPrice?.toString() || ''}
            onChange={(val) =>
              dispatch({ type: 'setMaxPrice', payload: parseNumber(val) })
            }
            fullWidth
          />
          <UserFilterTextField
            label="In Stock Only"
            select
            value={state.inStockOnly ? 'yes' : 'no'}
            onChange={(val) =>
              dispatch({ type: 'setInStockOnly', payload: val === 'yes' })
            }
            options={[
              { value: 'no', label: 'All' },
              { value: 'yes', label: 'In Stock Only' },
            ]}
            fullWidth
          />
          <UserFilterDatePicker
            label="Start Date"
            value={state.startDate ? dayjs(state.startDate) : null}
            onChange={(date: Dayjs | null) =>
              dispatch({
                type: 'setStartDate',
                payload: date?.toDate() || null,
              })
            }
            fullWidth
          />
          <UserFilterDatePicker
            label="End Date"
            value={state.endDate ? dayjs(state.endDate) : null}
            onChange={(date: Dayjs | null) =>
              dispatch({
                type: 'setEndDate',
                payload: date?.toDate() || null,
              })
            }
            fullWidth
          />
          <UserFilterTextField
            label="Sort By"
            select
            value={state.sortDirection}
            onChange={(val) =>
              dispatch({
                type: 'setSortDirection',
                payload: val as 'asc' | 'desc',
              })
            }
            options={[
              { value: 'desc', label: 'Newest' },
              { value: 'asc', label: 'Oldest' },
            ]}
            fullWidth
          />
        </Stack>
      </Box>

      {isMobile && hasFilters && (
        <Fab
          color="warning"
          size="medium"
          aria-label="reset"
          onClick={() => dispatch({ type: 'RESET_FILTERS' })}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1300,
          }}
        >
          <RestartAltIcon />
        </Fab>
      )}
    </>
  );
}
