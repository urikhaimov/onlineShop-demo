// src/features/admin/orders/AdminOrderFilters.tsx
import React from 'react';
import { Box, Fab, Stack, useMediaQuery, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import dayjs, { Dayjs } from 'dayjs';

import UserFilterTextField from '../../../components/UserFilterTextField';
import UserFilterDatePicker from '../../../components/UserFilterDatePicker';
import { useAdminOrdersStore } from '../../../stores/useAdminOrdersStore';

const statusOptions = ['all', 'pending', 'shipped', 'delivered', 'succeeded'];

export default function AdminOrderFilters() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { filters, updateFilter, resetFilters } = useAdminOrdersStore();

  const hasFilters = Boolean(
    filters.email ||
      filters.status !== 'all' ||
      filters.minTotal ||
      filters.maxTotal ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.startDate ||
      filters.endDate ||
      filters.inStockOnly,
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
            value={filters.email}
            onChange={(val) => updateFilter('email', val)}
            fullWidth
          />
          <UserFilterTextField
            label="Status"
            select
            value={filters.status}
            onChange={(val) => updateFilter('status', val)}
            options={statusOptions.map((s) => ({ value: s, label: s }))}
            fullWidth
          />
          <UserFilterTextField
            label="Min Total"
            type="number"
            value={filters.minTotal?.toString() || ''}
            onChange={(val) =>
              updateFilter('minTotal', parseNumber(val) ?? null)
            }
            fullWidth
          />
          <UserFilterTextField
            label="Max Total"
            type="number"
            value={filters.maxTotal?.toString() || ''}
            onChange={(val) =>
              updateFilter('maxTotal', parseNumber(val) ?? null)
            }
            fullWidth
          />
          <UserFilterTextField
            label="Min Price"
            type="number"
            value={filters.minPrice?.toString() || ''}
            onChange={(val) =>
              updateFilter('minPrice', parseNumber(val) ?? null)
            }
            fullWidth
          />
          <UserFilterTextField
            label="Max Price"
            type="number"
            value={filters.maxPrice?.toString() || ''}
            onChange={(val) =>
              updateFilter('maxPrice', parseNumber(val) ?? null)
            }
            fullWidth
          />
          <UserFilterTextField
            label="In Stock Only"
            select
            value={filters.inStockOnly ? 'yes' : 'no'}
            onChange={(val) => updateFilter('inStockOnly', val === 'yes')}
            options={[
              { value: 'no', label: 'All' },
              { value: 'yes', label: 'In Stock Only' },
            ]}
            fullWidth
          />
          <UserFilterDatePicker
            label="Start Date"
            value={filters.startDate ? dayjs(filters.startDate) : null}
            onChange={(date: Dayjs | null) =>
              updateFilter('startDate', date?.toDate() || null)
            }
            fullWidth
          />
          <UserFilterDatePicker
            label="End Date"
            value={filters.endDate ? dayjs(filters.endDate) : null}
            onChange={(date: Dayjs | null) =>
              updateFilter('endDate', date?.toDate() || null)
            }
            fullWidth
          />
          <UserFilterTextField
            label="Sort By"
            select
            value={filters.sortDirection}
            onChange={(val) =>
              updateFilter('sortDirection', val as 'asc' | 'desc')
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
          onClick={resetFilters}
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
