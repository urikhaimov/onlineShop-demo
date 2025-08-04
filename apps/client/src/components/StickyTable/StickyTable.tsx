import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  TableOptions,
} from '@tanstack/react-table';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import { renderColumnFilter } from './renderColumnFilter';
import { tableFilters } from './tableFilters';

interface StickyTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  initialState?: Partial<TableOptions<T>['state']>;
}

export default function StickyTable<T extends object>({
  data,
  columns,
  initialState,
}: StickyTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    state: initialState,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: tableFilters,
  });

  return (
    <Paper>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id} colSpan={header.colSpan}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getCanFilter() && (
                      <Box>{renderColumnFilter(header.column, table)}</Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
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
      <TablePagination
        component="div"
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, newPage) => table.setPageIndex(newPage)}
        onRowsPerPageChange={(e) => {
          table.setPageSize(Number(e.target.value));
        }}
        rowsPerPageOptions={[5, 10, 20, 50]}
      />
    </Paper>
  );
}
