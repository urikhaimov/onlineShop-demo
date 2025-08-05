import type { FilterFn } from '@tanstack/react-table';
import dayjs from 'dayjs';

export const betweenNumberRange: FilterFn<any> = (
  row,
  columnId,
  filterValue,
) => {
  const raw = row.getValue<number>(columnId);
  const [min, max] = filterValue;
  const value = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (typeof value !== 'number' || isNaN(value)) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
};

export const betweenDateRange: FilterFn<any> = (row, columnId, filterValue) => {
  const raw = row.getValue<string | Date>(columnId);
  const date = dayjs(raw);
  const [start, end] = filterValue;
  if (!date.isValid()) return false;
  if (start && date.isBefore(dayjs(start), 'day')) return false;
  if (end && date.isAfter(dayjs(end), 'day')) return false;
  return true;
};

export const statusEquals: FilterFn<any> = (row, columnId, filterValue) => {
  return row.getValue(columnId) === filterValue;
};

export const tableFilters = {
  betweenNumberRange,
  betweenDateRange,
  statusEquals,
};
