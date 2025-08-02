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
  Stack,
  Collapse,
  Typography,
  IconButton,
} from '@mui/material';
import { renderColumnFilter } from './renderColumnFilter';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
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

  const isColumnFiltered = (id: string) =>
    columnFilters.some((f) => f.id === id && !!f.value);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <TableContainer
        component={Paper}
        sx={{
          minWidth: 650,
          borderRadius: 2,
          boxShadow: 1,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} sx={{ height: 56 }}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  const isFiltered = isColumnFiltered(header.column.id);
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        backgroundColor: isFiltered
                          ? theme.palette.action.selected
                          : theme.palette.grey[50],
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        fontWeight: 600,
                        px: 1.5,
                        py: 0.75,
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                        color: isSorted
                          ? theme.palette.primary.main
                          : theme.palette.text.primary,
                        '&:first-of-type': {
                          borderTopLeftRadius: 8,
                        },
                        '&:last-of-type': {
                          borderTopRightRadius: 8,
                        },
                      }}
                    >
                      <Stack spacing={0.5}>
                        {!header.isPlaceholder && (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                            noWrap
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                        )}

                        {enableColumnFilters &&
                          header.column.getCanFilter() && (
                            <Box sx={{ mt: 0.25 }}>
                              {renderColumnFilter(header.column, table)}
                            </Box>
                          )}
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>

          <TableBody>
            {rows.map((row, rowIndex) => {
              const isExpanded = expandedRowIndex === rowIndex;
              return (
                <React.Fragment key={row.id}>
                  <TableRow
                    sx={{
                      backgroundColor:
                        rowIndex % 2 === 0
                          ? 'background.default'
                          : 'background.paper',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    {isMobile ? (
                      <TableCell colSpan={columns.length}>
                        <Stack direction="row" justifyContent="space-between">
                          <Box>
                            <Typography fontWeight="bold">
                              {String(row.getValue('name'))}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {(() => {
                                const price = row.getValue('price');
                                return typeof price === 'number'
                                  ? `$${price.toFixed(2)}`
                                  : '—';
                              })()}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() =>
                              setExpandedRowIndex(isExpanded ? null : rowIndex)
                            }
                          >
                            {isExpanded ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    ) : (
                      row
                        .getVisibleCells()
                        .map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))
                    )}
                  </TableRow>

                  {isMobile && (
                    <TableRow>
                      <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box p={2}>
                            {row.getVisibleCells().map((cell) => (
                              <Box key={cell.id} mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {cell.column.columnDef.header as string}
                                </Typography>
                                <Typography>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}

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
          rowsPerPageOptions={[]}
          onRowsPerPageChange={() => {
            // No-op, as we are not allowing changing rows per page
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
