import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
} from '@mui/material';
import { renderColumnFilter } from './renderColumnFilter';

interface StickyTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  stickyColumnIndex?: number;
  enablePagination?: boolean;
  rowsPerPage?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => void;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
}

export default function StickyTable<T>({
  columns,
  data,
  stickyColumnIndex = 0,
  enablePagination = true,
  rowsPerPage = 10,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  enableSorting = true,
  enableColumnFilters = true,
}: StickyTableProps<T>) {
  const [tableData, setTableData] = useState<T[]>(data);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange,
    onColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting,
    enableColumnFilters,
  });

  const { rows } = table.getRowModel();

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {enableColumnFilters && header.column.getCanFilter()
                      ? renderColumnFilter(header.column, table)
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {enablePagination && (
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, newPage) => table.setPageIndex(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[]}
          onRowsPerPageChange={() => {
            // No-op: rows per page is fixed
          }}
        />
      )}
    </Box>
  );
}
