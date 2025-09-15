// src/pages/user/UserProductFilters.tsx
import * as React from 'react';
import {
  Box,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';

import { useProductStore } from '../../stores/useProductStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ECurrency, type TCategory } from '@common/types';
import FiltersFooterActions from '../../components/FiltersFooterActions';
import RangeFilterSlider from '../../components/RangeFilterSlider';
import { formatCurrency } from '@common/utils';

const PRICE_MIN = 0;
const PRICE_MAX = 100_000;
const STOCK_MIN = 0;
const STOCK_MAX = 1_000;

type Props = {
  categories: TCategory[];
  onClose?: () => void; // drawer closer (used by Apply)
  closeOnChange?: boolean; // optional: auto-close after each change
};

export default function UserProductFilters({
  categories,
  onClose,
  closeOnChange = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const mui = useTheme();
  const isMobile = useMediaQuery(mui.breakpoints.down('sm'));

  // ---- Theme-aware rhythm (spacing/radius) ----
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);

  const gapUnit = Math.max(1, Math.round(2 * spacingScale));
  const gap = mui.spacing(gapUnit);

  const padX = {
    xs: mui.spacing(1.5 * spacingScale),
    sm: mui.spacing(2 * spacingScale),
  };
  const padY = {
    xs: mui.spacing(spacingScale),
    sm: mui.spacing(1.25 * spacingScale),
  };

  // ---- Store state ----
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

  // ---- Helpers ----
  const lang =
    (i18n as any)?.resolvedLanguage ?? (i18n as any)?.language ?? 'en';
  const currency = (v: number) => formatCurrency(v, ECurrency.ILS, lang);

  const maybeClose = () => {
    if (closeOnChange && onClose) onClose();
  };

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

  // Clamp slider values safely
  const priceMinClamped = Math.max(PRICE_MIN, Math.min(minPrice, PRICE_MAX));
  const priceMaxClamped = Math.max(PRICE_MIN, Math.min(maxPrice, PRICE_MAX));
  const stockMinClamped = Math.max(STOCK_MIN, Math.min(minStock, STOCK_MAX));
  const stockMaxClamped = Math.max(STOCK_MIN, Math.min(maxStock, STOCK_MAX));

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setUpdatedFrom(null);
    setUpdatedTo(null);
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinStock(STOCK_MIN);
    setMaxStock(STOCK_MAX);
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', boxSizing: 'border-box' }}>
      <Stack spacing={gap} sx={{ px: padX, py: padY }}>
        {/* Search */}
        <TextField
          label={t('filters.search', { defaultValue: 'Search' })}
          size="small"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
          fullWidth
          placeholder={t('actions.searchPlaceholder', {
            defaultValue: 'Search products…',
          })}
          inputProps={{
            inputMode: 'search',
            'aria-label': t('filters.search', {
              defaultValue: 'Search',
            }) as string,
          }}
          autoComplete="off"
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
          <MenuItem value="">
            {t('filters.all', { defaultValue: 'All' })}
          </MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Updated From / To (with LocalizationProvider for MUI X pickers) */}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={lang}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={gap}>
            <DatePicker
              label={t('filters.updatedFrom', { defaultValue: 'Updated from' })}
              value={updatedFrom ?? null}
              onChange={(value) => onUpdatedFromChange(value as Dayjs | null)}
              reduceAnimations={isMobile}
              slotProps={{
                textField: { fullWidth: true, size: 'small' },
                openPickerButton: { size: 'small' },
              }}
            />
            <DatePicker
              label={t('filters.updatedTo', { defaultValue: 'Updated to' })}
              value={updatedTo ?? null}
              onChange={(value) => onUpdatedToChange(value as Dayjs | null)}
              reduceAnimations={isMobile}
              slotProps={{
                textField: { fullWidth: true, size: 'small' },
                openPickerButton: { size: 'small' },
              }}
            />
          </Stack>
        </LocalizationProvider>

        {/* Price range */}
        <RangeFilterSlider
          label={t('filters.priceRange', { defaultValue: 'Price range' })}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50}
          value={[priceMinClamped, priceMaxClamped]}
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
          value={[stockMinClamped, stockMaxClamped]}
          onChange={(min, max) => {
            setMinStock(min);
            setMaxStock(max);
          }}
          onCommit={maybeClose}
        />
      </Stack>

      {/* Footer actions (sticky within drawer, consistent spacing) */}
      <Box sx={{ px: padX, pb: padY }}>
        <FiltersFooterActions
          onReset={handleReset}
          onApply={handleApply}
          showApply={isMobile}
          size="small"
          minButtonWidth={120}
        />
      </Box>
    </Box>
  );
}
