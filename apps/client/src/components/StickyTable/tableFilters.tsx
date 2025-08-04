import { Row, FilterFn } from '@tanstack/react-table';
import dayjs from 'dayjs';

/**
 * Filters a row by checking if a numeric value is between a min and max range.
 */
export const betweenNumberRange: FilterFn<any> = (
  row,
  columnId,
  filterValue: [number | null, number | null],
) => {
  const raw = row.getValue<number>(columnId);
  const [min, max] = filterValue;

  const value = typeof raw === 'string' ? parseFloat(raw) : raw;

  if (typeof value !== 'number' || isNaN(value)) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;

  return true;
};

/**
 * Filters a row by checking if a date value is between a start and end range.
 */
export const betweenDateRange: FilterFn<any> = (
  row,
  columnId,
  filterValue: [string | null, string | null],
) => {
  const raw = row.getValue<string | Date>(columnId);
  const date = dayjs(raw);
  const [start, end] = filterValue;

  if (!date.isValid()) return false;
  if (start && date.isBefore(dayjs(start), 'day')) return false;
  if (end && date.isAfter(dayjs(end), 'day')) return false;

  return true;
};

/**
 * Custom filter functions to be registered in useReactTable
 */
export const tableFilters: Record<string, FilterFn<any>> = {
  betweenNumberRange,
  betweenDateRange,
};
