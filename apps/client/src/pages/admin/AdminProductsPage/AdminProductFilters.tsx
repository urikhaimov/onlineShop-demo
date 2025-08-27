import * as React from 'react';
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import type { Dayjs } from 'dayjs';

import UserFilterTextField from '../../../components/UserFilterTextField';
import UserFilterDatePicker from '../../../components/UserFilterDatePicker';
import RangeFilterSlider from '../../../components/RangeFilterSlider';
import FiltersFooterActions from '../../../components/FiltersFooterActions';
import { useProductStore } from '../../../stores/useProductStore';
import { useTranslation } from 'react-i18next';
import { CURRENCY_SYMBOL } from '@common/types';

type Props = {
  categories: { id: string; name: string }[];
  onClose?: () => void; // close drawer on Apply (mobile)
};

const PRICE_MIN = 0;
const PRICE_MAX = 100_000;
const STOCK_MIN = 0;
const STOCK_MAX = 1_000;

export default function AdminProductFilters({ categories, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
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
    new Intl.NumberFormat((i18n.language || 'en').split('-')[0], {
      style: 'currency',
      currency: CURRENCY_SYMBOL.USD,
      maximumFractionDigits: 0,
    }).format(v);

  const reset = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setUpdatedFrom(null);
    setUpdatedTo(null);
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinStock(STOCK_MIN);
    setMaxStock(STOCK_MAX);
  };

  const handleApply = React.useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    onClose?.(); // close the drawer on mobile
  }, [onClose]);

  return (
    <>
      <Box pr={1}>
        <Stack spacing={2}>
          <UserFilterTextField
            label={t('filters.search')}
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            fullWidth
          />

          <UserFilterTextField
            label={t('filters.category')}
            select
            value={selectedCategoryId}
            onChange={(val) => setSelectedCategoryId(val)}
            options={[
              { value: '', label: t('filters.all') },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            fullWidth
          />

          {/* Price range */}
          <RangeFilterSlider
            label={t('filters.priceRange')}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={50}
            value={[
              Math.max(PRICE_MIN, Math.min(minPrice, PRICE_MAX)),
              Math.max(PRICE_MIN, Math.min(maxPrice, PRICE_MAX)),
            ]}
            formatValue={currency}
            onChange={(lo, hi) => {
              setMinPrice(lo);
              setMaxPrice(hi);
            }}
          />

          {/* Stock range */}
          <RangeFilterSlider
            label={t('filters.stockRange')}
            min={STOCK_MIN}
            max={STOCK_MAX}
            step={1}
            value={[
              Math.max(STOCK_MIN, Math.min(minStock, STOCK_MAX)),
              Math.max(STOCK_MIN, Math.min(maxStock, STOCK_MAX)),
            ]}
            onChange={(lo, hi) => {
              setMinStock(lo);
              setMaxStock(hi);
            }}
          />

          <UserFilterDatePicker
            label={t('filters.updatedFrom')}
            value={updatedFrom ?? null}
            onChange={(d: Dayjs | null) => setUpdatedFrom(d)}
            fullWidth
          />
          <UserFilterDatePicker
            label={t('filters.updatedTo')}
            value={updatedTo ?? null}
            onChange={(d: Dayjs | null) => setUpdatedTo(d)}
            fullWidth
          />
        </Stack>
      </Box>

      {/* Footer actions */}
      <FiltersFooterActions
        onReset={reset}
        onApply={handleApply}
        showApply={isMobile}
        size="small"
        minButtonWidth={120}
      />
    </>
  );
}
