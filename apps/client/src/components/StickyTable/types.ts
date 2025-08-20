import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';
import React from 'react';

export interface StickyTableProps<T extends object> {
  columns: ColumnDef<T>[];
  data: T[];
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => void;
  stickyColumnIndex?: number; // reserved
  enablePagination?: boolean;
  rowsPerPage?: number;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  groupById?: keyof T;
  enableRowExpansion?: boolean;
  /** Custom renderer for expanded row content */
  renderExpandedRow?: (row: T) => React.ReactNode;
  /** Max height of the scrollable table body (e.g. 480, '60vh'). */
  bodyMaxHeight?: number | string;
}

export type GroupSortMode = 'count' | 'alpha';
