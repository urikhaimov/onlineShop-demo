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
import { useTranslation } from 'react-i18next';
import { ECurrency } from '@common/types';
import { formatCurrency } from '@common/utils';

const statusOptions = [
  'all',
  'pending',
  'shipped',
  'delivered',
  'succeeded',
] as const satisfies OrderStatus[];

const TOTAL_MIN = 0;
const TOTAL_MAX = 100_000;

type Props = { onClose?: () => void };

export default function AdminOrderFilters({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { filters, updateFilter, resetFilters } = useAdminOrdersStore();

  const currency = (v: number) =>
    formatCurrency(v, ECurrency.ILS, i18n.language);

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
            label={t('filters.userEmail')}
            value={filters.email}
            onChange={(val) => updateFilter('email', val)}
            fullWidth
          />

          <UserFilterTextField
            label={t('filters.status')}
            select
            value={filters.status}
            onChange={(val) => updateFilter('status', val as OrderStatus)}
            options={statusOptions.map((s) => ({
              value: s,
              label: s === 'all' ? t('filters.all') : t(`orders.status.${s}`),
            }))}
            fullWidth
          />

          {/* Total range */}
          <RangeFilterSlider
            label={t('filters.totalRange')}
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
            label={t('filters.dateFrom')}
            value={filters.startDate ? dayjs(filters.startDate) : null}
            onChange={(date: Dayjs | null) =>
              updateFilter('startDate', date?.toDate() || null)
            }
            fullWidth
          />
          <UserFilterDatePicker
            label={t('filters.dateTo')}
            value={filters.endDate ? dayjs(filters.endDate) : null}
            onChange={(date: Dayjs | null) =>
              updateFilter('endDate', date?.toDate() || null)
            }
            fullWidth
          />

          <UserFilterTextField
            label={t('sort.by')}
            select
            value={filters.sortDirection}
            onChange={(val) =>
              updateFilter('sortDirection', val as 'asc' | 'desc')
            }
            options={[
              { value: 'desc', label: t('sort.newest') },
              { value: 'asc', label: t('sort.oldest') },
            ]}
            fullWidth
          />
        </Stack>
      </Box>

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
