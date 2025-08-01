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
  useTheme,
  useMediaQuery,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <TableContainer
        component={Paper}
        sx={{
          minWidth: 650,
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
                  >
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

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
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
          rowsPerPageOptions={[]} // no dropdown
          onRowsPerPageChange={() => {
            // No-op: rows per page is fixed
          }}
          sx={{
            mt: 1,
            px: isMobile ? 1 : 2,
            '& .MuiTablePagination-toolbar': {
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
            },
          }}
        />
      )}
    </Box>
  );
}
