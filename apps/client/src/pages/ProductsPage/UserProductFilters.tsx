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
  /** call to close the drawer */
  onClose?: () => void;
  /** close drawer after each change (except typing in Search) */
  closeOnChange?: boolean;
};

export default function UserProductFilters({
  categories,
  onClose,
  closeOnChange = false,
}: Props) {
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

  const maybeClose = () => {
    if (closeOnChange && onClose) onClose();
  };

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

  const handlePriceChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinPrice(min);
    setMaxPrice(max);
  };
  const handlePriceChangeCommitted = () => maybeClose();

  const handleStockChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setMinStock(min);
    setMaxStock(max);
  };
  const handleStockChangeCommitted = () => maybeClose();

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setUpdatedFrom(null);
    setUpdatedTo(null);
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinStock(STOCK_MIN);
    setMaxStock(STOCK_MAX);
    maybeClose();
  };

  return (
    <Stack spacing={2}>
      {/* Search (do not auto-close while typing) */}
      <TextField
        label="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') maybeClose();
        }}
        fullWidth
      />

      {/* Category */}
      <TextField
        label="Category"
        select
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <DatePicker
          label="Updated From"
          value={updatedFrom ?? null}
          onChange={onUpdatedFromChange}
          slotProps={{ textField: { fullWidth: true } }}
        />
        <DatePicker
          label="Updated To"
          value={updatedTo ?? null}
          onChange={onUpdatedToChange}
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Stack>

      {/* Price range */}
      <Box>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
          Price range: {currency(minPrice)} – {currency(maxPrice)}
        </Typography>
        <Slider
          value={[minPrice, maxPrice]}
          onChange={handlePriceChange}
          onChangeCommitted={handlePriceChangeCommitted}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => currency(v as number)}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50}
          getAriaLabel={() => 'Price range'}
          marks={[
            { value: PRICE_MIN, label: currency(PRICE_MIN) },
            { value: PRICE_MAX, label: currency(PRICE_MAX) },
          ]}
        />
      </Box>

      {/* Stock range */}
      <Box>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
          Stock range: {minStock} – {maxStock}
        </Typography>
        <Slider
          value={[minStock, maxStock]}
          onChange={handleStockChange}
          onChangeCommitted={handleStockChangeCommitted}
          valueLabelDisplay="auto"
          min={STOCK_MIN}
          max={STOCK_MAX}
          step={1}
          getAriaLabel={() => 'Stock range'}
          marks={[
            { value: STOCK_MIN, label: String(STOCK_MIN) },
            { value: STOCK_MAX, label: String(STOCK_MAX) },
          ]}
        />
      </Box>

      <Box display="flex" justifyContent="flex-end">
        <Button onClick={handleReset} variant="outlined" color="secondary">
          Reset
        </Button>
      </Box>
    </Stack>
  );
}
