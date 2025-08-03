import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Updater,
  Row,
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
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { renderColumnFilter } from './renderColumnFilter';

interface StickyTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => void;
  stickyColumnIndex?: number;
  enablePagination?: boolean;
  rowsPerPage?: number;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  groupById?: keyof T;
}

export default function StickyTable<T extends Record<string, any>>({
  columns,
  data,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  stickyColumnIndex = 0,
  enablePagination = true,
  rowsPerPage = 10,
  enableSorting = true,
  enableColumnFilters = true,
  groupById,
}: StickyTableProps<T>) {
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const [groupSortMode, setGroupSortMode] = useState<'count' | 'alpha'>(
    'count',
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const table = useReactTable({
    data,
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
    getGroupedRowModel: getGroupedRowModel(),
    manualGrouping: false,
    initialState: {
      grouping: groupById ? [String(groupById)] : [],
    },
    enableSorting,
    enableColumnFilters,
  });

  const rowModel = table.getRowModel();
  const grouped = !!groupById && table.getState().grouping.length > 0;

  useEffect(() => {
    if (grouped) {
      const openState: Record<string, boolean> = {};
      rowModel.rows.forEach((row) => {
        if (row.getIsGrouped()) {
          openState[row.id] = true;
        }
      });
      setGroupOpen(openState);
    }
  }, [grouped, rowModel.rows]);

  const toggleGroup = (key: string) =>
    setGroupOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const isColumnFiltered = (id: string) =>
    columnFilters.some((f) => f.id === id && !!f.value);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      {grouped && (
        <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Tooltip
            title={`Sort by ${groupSortMode === 'count' ? 'count' : 'name'}`}
          >
            <IconButton
              onClick={() =>
                setGroupSortMode((prev) =>
                  prev === 'count' ? 'alpha' : 'count',
                )
              }
              size="small"
              sx={{ border: `1px solid ${theme.palette.divider}` }}
            >
              <SwapVertIcon fontSize="small" />
              <Typography variant="caption" ml={0.5}>
                {groupSortMode === 'count' ? 'Count' : 'Name'}
              </Typography>
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <TableContainer
        component={Paper}
        sx={{
          minWidth: 650,
          borderRadius: 2,
          boxShadow: 1,
          border: `1px solid ${theme.palette.divider}`,
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isFiltered = isColumnFiltered(header.column.id);
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        backgroundColor: isFiltered
                          ? theme.palette.action.selected
                          : theme.palette.grey[50],
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        px: 1.5,
                        py: 0.75,
                      }}
                    >
                      <Stack spacing={0.5}>
                        {!header.isPlaceholder && (
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {typeof header.column.columnDef.header ===
                            'function'
                              ? header.column.columnDef.header(
                                  header.getContext(),
                                )
                              : header.column.columnDef.header}
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
            {[...rowModel.rows]
              .sort((a: Row<T>, b: Row<T>) => {
                if (a.getIsGrouped() && b.getIsGrouped()) {
                  return groupSortMode === 'count'
                    ? b.subRows.length - a.subRows.length
                    : String(a.getValue(groupById as string)).localeCompare(
                        String(b.getValue(groupById as string)),
                      );
                }
                return 0;
              })
              .map((row, rowIndex) => {
                if (row.getIsGrouped()) {
                  const groupKey = row.id;
                  const isOpen = groupOpen[groupKey];
                  return (
                    <TableRow
                      key={row.id}
                      sx={{ backgroundColor: theme.palette.action.hover }}
                    >
                      <TableCell colSpan={columns.length}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <Typography fontWeight={600}>
                            {row.getValue(groupById as string)}{' '}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              ({row.subRows.length})
                            </Typography>
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                }

                const groupKey = row.id.split('.')[0];
                const isOpen = groupOpen[groupKey];
                if (!isOpen) return null;

                const isExpanded = expandedRowIndex === rowIndex;

                return (
                  <React.Fragment key={row.id}>
                    <TableRow>
                      {isMobile ? (
                        <TableCell colSpan={columns.length}>
                          <Stack direction="row" justifyContent="space-between">
                            <Box>
                              <Typography fontWeight="bold">
                                {String(row.getValue('name'))}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
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
                                setExpandedRowIndex(
                                  isExpanded ? null : rowIndex,
                                )
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
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box p={2}>
                              {row.getVisibleCells().map((cell) => (
                                <Box key={cell.id} mb={1}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {String(cell.column.columnDef.header)}
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

            {rowModel.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {enablePagination && !grouped && (
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, newPage) => table.setPageIndex(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[]}
          onRowsPerPageChange={() => {
            // No-op since we don't allow changing rows per page
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
