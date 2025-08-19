// src/pages/UserProductFilters.tsx
import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Slider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { useProductStore } from '../../stores/useProductStore';
import type { TCategory } from '@common/types';

const PRICE_MIN = 0;
const PRICE_MAX = 100_000;
const STOCK_MIN = 0;
const STOCK_MAX = 1_000;

type Props = {
  categories: TCategory[];
  onClose?: () => void;
  closeOnChange?: boolean;
};

export default function UserProductFilters({
  categories,
  onClose,
  closeOnChange = false,
}: Props) {
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

  const maybeClose = () => {
    if (closeOnChange && onClose) onClose();
  };

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

  // Sliders
  const handlePriceChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinPrice(min);
    setMaxPrice(max);
  };
  const handleStockChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinStock(min);
    setMaxStock(max);
  };

  return (
    <Stack
      spacing={2}
      sx={{
        px: { xs: 2, sm: 3 }, // ← equal L/R padding
        py: 1,
      }}
    >
      {/* Search */}
      <TextField
        label="Search"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && maybeClose()}
        fullWidth
      />

      {/* Category */}
      <TextField
        label="Category"
        select
        size="small"
        value={selectedCategoryId}
        onChange={(e) => {
          setSelectedCategoryId(e.target.value);
          maybeClose();
        }}
        fullWidth
      >
        <MenuItem value="">All</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Updated From / To */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DatePicker
          label="Updated From"
          value={updatedFrom ?? null}
          onChange={onUpdatedFromChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label="Updated To"
          value={updatedTo ?? null}
          onChange={onUpdatedToChange}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Stack>

      {/* Price range */}
      <Box sx={{ px: { xs: 1, sm: 1.5 } }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
          Price range: {currency(minPrice)} – {currency(maxPrice)}
        </Typography>
        <Slider
          value={[
            Math.max(PRICE_MIN, Math.min(minPrice, PRICE_MAX)),
            Math.max(PRICE_MIN, Math.min(maxPrice, PRICE_MAX)),
          ]}
          onChange={handlePriceChange}
          onChangeCommitted={maybeClose}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => currency(v as number)}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50}
          getAriaLabel={() => 'Price range'}
          sx={{ mx: { xs: 0.5, sm: 1 } }}
          marks={[
            { value: PRICE_MIN, label: currency(PRICE_MIN) },
            { value: PRICE_MAX, label: currency(PRICE_MAX) },
          ]}
        />
      </Box>

      {/* Stock range */}
      <Box sx={{ px: { xs: 1, sm: 1.5 } }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
          Stock range: {minStock} – {maxStock}
        </Typography>
        <Slider
          value={[
            Math.max(STOCK_MIN, Math.min(minStock, STOCK_MAX)),
            Math.max(STOCK_MIN, Math.min(maxStock, STOCK_MAX)),
          ]}
          onChange={handleStockChange}
          onChangeCommitted={maybeClose}
          valueLabelDisplay="auto"
          min={STOCK_MIN}
          max={STOCK_MAX}
          step={1}
          getAriaLabel={() => 'Stock range'}
          sx={{ mx: { xs: 0.5, sm: 1 } }}
          marks={[
            { value: STOCK_MIN, label: String(STOCK_MIN) },
            { value: STOCK_MAX, label: String(STOCK_MAX) },
          ]}
        />
      </Box>

      <Box display="flex" justifyContent="flex-end" sx={{ pt: 0.5 }}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() => {
            setSearchTerm('');
            setSelectedCategoryId('');
            setUpdatedFrom(null);
            setUpdatedTo(null);
            setMinPrice(PRICE_MIN);
            setMaxPrice(PRICE_MAX);
            setMinStock(STOCK_MIN);
            setMaxStock(STOCK_MAX);
            maybeClose();
          }}
        >
          Reset Filters
        </Button>
      </Box>
    </Stack>
  );
}
