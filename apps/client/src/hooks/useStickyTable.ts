import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  ColumnDef,
} from '@tanstack/react-table';
import { useState, useEffect } from 'react';

interface UseStickyTableOptions<T> {
  data: T[] | undefined;
  columns: ColumnDef<T, any>[] | undefined;
  initialSorting?: SortingState;
  initialFilters?: ColumnFiltersState;
}

export function useStickyTable<T>({
  data = [],
  columns = [],
  initialSorting = [],
  initialFilters = [],
}: UseStickyTableOptions<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialFilters);

  const table = useReactTable({
    data: Array.isArray(data) ? data : [],
    columns: Array.isArray(columns) ? columns : [],
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: true,
    enableColumnFilters: true,
  });

  useEffect(() => {
    // Defensive check to avoid table errors on hot reload or undefined input
    table.setOptions((prev) => ({
      ...prev,
      data: Array.isArray(data) ? data : [],
    }));
  }, [data]);

  return {
    table,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    resetFilters: () => table.resetColumnFilters(),
  };
}
