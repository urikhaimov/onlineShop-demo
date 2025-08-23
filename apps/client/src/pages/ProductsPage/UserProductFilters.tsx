import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextField,
  MenuItem,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';

import { useProductStore } from '../../stores/useProductStore';
import type { TCategory } from '@common/types';
import FiltersFooterActions from '../../components/FiltersFooterActions';
import RangeFilterSlider from '../../components/RangeFilterSlider';

const PRICE_MIN = 0;
const PRICE_MAX = 100_000;
const STOCK_MIN = 0;
const STOCK_MAX = 1_000;

type Props = {
  categories: TCategory[];
  onClose?: () => void; // for "Apply"
  closeOnChange?: boolean; // auto-close on each change
};

export default function UserProductFilters({
  categories,
  onClose,
  closeOnChange = false,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // show Apply on mobile

  const {
    // state
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    // setters
    setSearchTerm,
    setSelectedCategoryId,
    setUpdatedFrom,
    setUpdatedTo,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
  } = useProductStore();

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const maybeClose = () => {
    if (closeOnChange && onClose) onClose();
  };

  // Dates
  const onUpdatedFromChange = (d: Dayjs | null) => {
    if (d && updatedTo && d.isAfter(updatedTo)) setUpdatedTo(d);
    setUpdatedFrom(d);
    maybeClose();
  };
  const onUpdatedToChange = (d: Dayjs | null) => {
    if (d && updatedFrom && d.isBefore(updatedFrom)) setUpdatedFrom(d);
    setUpdatedTo(d);
    maybeClose();
  };

  // Apply: blur active element (IME/keyboard) then close the drawer
  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.();
  }, [onClose]);

  return (
    <Stack spacing={2} sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
      {/* Search */}
      <TextField
        label={t('actions.searchPlaceholder', { defaultValue: 'Search…' })}
        placeholder={t('actions.searchPlaceholder', {
          defaultValue: 'Search…',
        })}
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
        fullWidth
      />

      {/* Category */}
      <TextField
        label={t('table.category', { defaultValue: 'Category' })}
        select
        size="small"
        value={selectedCategoryId}
        onChange={(e) => {
          setSelectedCategoryId(e.target.value);
          maybeClose();
        }}
        fullWidth
      >
        <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Updated From / To */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DatePicker
          label={t('filters.updatedFrom', { defaultValue: 'Updated From' })}
          value={updatedFrom ?? null}
          onChange={onUpdatedFromChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label={t('filters.updatedTo', { defaultValue: 'Updated To' })}
          value={updatedTo ?? null}
          onChange={onUpdatedToChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Stack>

      {/* Price range */}
      <RangeFilterSlider
        label={t('filters.priceRange', { defaultValue: 'Price range' })}
        min={PRICE_MIN}
        max={PRICE_MAX}
        step={50}
        value={[
          Math.max(PRICE_MIN, Math.min(minPrice, PRICE_MAX)),
          Math.max(PRICE_MIN, Math.min(maxPrice, PRICE_MAX)),
        ]}
        formatValue={currency}
        onChange={(min, max) => {
          setMinPrice(min);
          setMaxPrice(max);
        }}
        onCommit={maybeClose}
      />

      {/* Stock range */}
      <RangeFilterSlider
        label={t('filters.stockRange', { defaultValue: 'Stock range' })}
        min={STOCK_MIN}
        max={STOCK_MAX}
        step={1}
        value={[
          Math.max(STOCK_MIN, Math.min(minStock, STOCK_MAX)),
          Math.max(STOCK_MIN, Math.min(maxStock, STOCK_MAX)),
        ]}
        onChange={(min, max) => {
          setMinStock(min);
          setMaxStock(max);
        }}
        onCommit={maybeClose}
      />

      {/* Footer actions */}
      <FiltersFooterActions
        onReset={() => {
          setSearchTerm('');
          setSelectedCategoryId('');
          setUpdatedFrom(null);
          setUpdatedTo(null);
          setMinPrice(PRICE_MIN);
          setMaxPrice(PRICE_MAX);
          setMinStock(STOCK_MIN);
          setMaxStock(STOCK_MAX);
        }}
        onApply={handleApply}
        showApply={isMobile}
        size="small"
        minButtonWidth={120}
        resetLabel={t('filters.reset', { defaultValue: 'Reset filters' })}
        applyLabel={t('common.apply', { defaultValue: 'Apply' })}
      />
    </Stack>
  );
}
