// src/hooks/useOrdersTableQuerySync.ts
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useStickyTableQuerySync } from './useStickyTableQuerySync';
import { useOrdersQuerySync } from './useOrdersQuerySync';

export type UseOrdersTableQuerySyncArgs<V extends string = string> = {
  // Table state
  sorting: SortingState;
  setSorting: (s: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (f: ColumnFiltersState) => void;

  // View mode (e.g., 'table' | 'cards')
  viewMode?: V;
  setViewMode?: (v: V) => void;

  // Orders page filters
  searchTerm: string;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;

  setSearchTerm: (v: string) => void;
  setStatus: (v: string | null) => void;
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
};

export function useOrdersTableQuerySync<V extends string = string>({
  // table
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  viewMode,
  setViewMode,

  // orders filters
  searchTerm,
  status,
  dateFrom,
  dateTo,
  setSearchTerm,
  setStatus,
  setDateFrom,
  setDateTo,
}: UseOrdersTableQuerySyncArgs<V>) {
  // Adapt a narrow setter (e.g., (v: 'table'|'cards')) to the generic string setter
  const adaptedSetViewMode = setViewMode
    ? (v: string) => setViewMode(v as V)
    : undefined;

  // Generic table state → URL (and hydrate)
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    viewMode: viewMode as unknown as string | undefined,
    setViewMode: adaptedSetViewMode,
  });

  // Orders page filters → URL (and hydrate)
  useOrdersQuerySync({
    searchTerm,
    status,
    dateFrom,
    dateTo,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
  });
}
