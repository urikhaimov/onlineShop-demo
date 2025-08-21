import React from 'react';
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';

import UserFilterTextField from '../../../components/UserFilterTextField';
import UserFilterDatePicker from '../../../components/UserFilterDatePicker';
import RangeFilterSlider from '../../../components/RangeFilterSlider';
import FiltersFooterActions from '../../../components/FiltersFooterActions';
import {
  useAdminOrdersStore,
  type OrderStatus,
} from '../../../stores/useAdminOrdersStore';

const statusOptions = [
  'all',
  'pending',
  'shipped',
  'delivered',
  'succeeded',
] as const satisfies OrderStatus[]; // ✅ typed options

const TOTAL_MIN = 0;
const TOTAL_MAX = 100_000;
const PRICE_MIN = 0; // kept if you add a price range slider later
const PRICE_MAX = 100_000;

type Props = {
  /** Close the filters drawer (used by Apply on mobile) */
  onClose?: () => void;
};

export default function AdminOrderFilters({ onClose }: Props) {
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

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Normalized current values (with safe bounds)
  const totalMin = Math.max(
    TOTAL_MIN,
    Math.min(filters.minTotal ?? TOTAL_MIN, TOTAL_MAX),
  );
  const totalMax = Math.max(
    TOTAL_MIN,
    Math.min(filters.maxTotal ?? TOTAL_MAX, TOTAL_MAX),
  );

  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.();
  }, [onClose]);

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
            onChange={(val) => updateFilter('status', val as OrderStatus)} // ✅ cast to union
            options={statusOptions.map((s) => ({ value: s, label: s }))}
            fullWidth
          />

          {/* Total range */}
          <RangeFilterSlider
            label="Total range"
            min={TOTAL_MIN}
            max={TOTAL_MAX}
            step={50}
            value={[totalMin, totalMax]}
            formatValue={currency}
            onChange={(lo, hi) => {
              updateFilter('minTotal', lo);
              updateFilter('maxTotal', hi);
            }}
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

      {/* Footer actions: show Apply on mobile, always show Reset */}
      <FiltersFooterActions
        onReset={resetFilters}
        onApply={handleApply}
        showApply={isMobile}
        size="small"
        minButtonWidth={120}
      />
    </>
  );
}
