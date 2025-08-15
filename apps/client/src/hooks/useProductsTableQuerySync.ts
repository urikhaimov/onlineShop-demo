import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import type { Dayjs } from 'dayjs';
import { useStickyTableQuerySync } from './useStickyTableQuerySync';
import { useProductsQuerySync } from './useProductsQuerySync';

type Args = {
  // table
  sorting: SortingState;
  setSorting: (s: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (f: ColumnFiltersState) => void;

  // products filters
  searchTerm: string;
  selectedCategoryId: string | null;
  createdAfter: Dayjs | null;
  minPrice: number;
  maxPrice: number;

  setSearchTerm: (v: string) => void;
  setSelectedCategoryId: (v: string | null) => void;
  setCreatedAfter: (v: Dayjs | null) => void;
  setMinPrice: (v: number) => void;
  setMaxPrice: (v: number) => void;

  // optional: view mode if you want to persist it too
  viewMode?: string;
  setViewMode?: (v: string) => void;
};

export function useProductsTableQuerySync(args: Args) {
  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    setSearchTerm,
    setSelectedCategoryId,
    setCreatedAfter,
    setMinPrice,
    setMaxPrice,
    viewMode,
    setViewMode,
  } = args;

  // Generic table state → URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    viewMode,
    setViewMode,
  });

  // Products page filters → URL
  useProductsQuerySync({
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    setSearchTerm,
    setSelectedCategoryId,
    setCreatedAfter,
    setMinPrice,
    setMaxPrice,
  });
}
