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
  enablePagination = true,
  rowsPerPage = 10,
  enableSorting = true,
  enableColumnFilters = true,
  groupById,
}: StickyTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [groupSortMode, setGroupSortMode] = useState<'count' | 'alpha'>(
    'count',
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
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
  const isGrouped = !!groupById && table.getState().grouping.length > 0;

  useEffect(() => {
    if (isGrouped) {
      const next: Record<string, boolean> = {};
      rowModel.rows.forEach((row) => {
        if (row.subRows.length > 0 && row.depth === 0) {
          next[row.id] = true;
        }
      });
      setExpandedGroups(next);
    }
  }, [data, groupById, isGrouped]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isColumnFiltered = (id: string) =>
    columnFilters.some((f) => f.id === id && !!f.value);

  const getStickyStyles = (meta?: any) => {
    const sticky = meta?.sticky;
    if (sticky === 'left') {
      return { position: 'sticky', left: 0, zIndex: 1 };
    }
    if (sticky === 'right') {
      return { position: 'sticky', right: 0, zIndex: 1 };
    }
    return {};
  };

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      {isGrouped && (
        <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Tooltip title={`Sort groups by ${groupSortMode}`}>
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
          borderRadius: 2,
          boxShadow: 1,
          border: `1px solid ${theme.palette.divider}`,
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const stickyStyles = getStickyStyles(
                    header.column.columnDef.meta,
                  );
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        ...stickyStyles,
                        top: 0,
                        zIndex: 10,
                        minWidth: header.column.columnDef.size ?? 100,
                        maxWidth: header.column.columnDef.size ?? 200,
                        backgroundColor: isColumnFiltered(header.column.id)
                          ? theme.palette.action.selected
                          : theme.palette.grey[50],
                        px: { xs: 0.75, sm: 1.5 },
                        py: { xs: 0.5, sm: 0.75 },
                        textAlign: 'center',
                        verticalAlign: 'top', // ✅ aligns text to top
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Stack
                        spacing={0.25}
                        alignItems="center" // ✅ horizontal center
                        justifyContent="flex-start" // ✅ vertical top
                      >
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          noWrap
                          sx={{
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            textAlign: 'center',
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Typography>

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
              .sort((a, b) => {
                if (a.depth === 0 && b.depth === 0) {
                  if (groupSortMode === 'count') {
                    return b.subRows.length - a.subRows.length;
                  } else {
                    return String(
                      a.getValue(groupById as string),
                    ).localeCompare(String(b.getValue(groupById as string)));
                  }
                }
                return 0;
              })
              .map((row) => {
                if (row.depth === 0 && row.subRows.length > 0) {
                  const isOpen = expandedGroups[row.id];
                  const label = String(row.getValue(groupById as string));
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        sx={{
                          backgroundColor: theme.palette.action.hover,
                          position: 'sticky',
                          top: 40, // Adjust based on header height
                          zIndex: 5,
                        }}
                      >
                        <TableCell colSpan={columns.length}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <IconButton
                              size="small"
                              onClick={() => toggleGroup(row.id)}
                            >
                              {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                            <Typography fontWeight={600}>
                              {label}{' '}
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

                      {isOpen &&
                        row.subRows.map((child) => (
                          <TableRow key={child.id}>
                            {child.getVisibleCells().map((cell) => {
                              const stickyStyles = getStickyStyles(
                                cell.column.columnDef.meta,
                              );
                              return (
                                <TableCell
                                  key={cell.id}
                                  sx={{
                                    ...stickyStyles,
                                    textAlign:
                                      cell.column.columnDef.meta
                                        ?.filterVariant === 'number'
                                        ? 'right'
                                        : 'left',
                                    px: { xs: 0.75, sm: 1.5 },
                                    py: { xs: 0.5, sm: 0.75 },
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                }

                if (row.depth === 0) {
                  return (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const stickyStyles = getStickyStyles(
                          cell.column.columnDef.meta,
                        );
                        return (
                          <TableCell
                            key={cell.id}
                            sx={{
                              ...stickyStyles,
                              textAlign:
                                cell.column.columnDef.meta?.filterVariant ===
                                'number'
                                  ? 'right'
                                  : 'left',
                              px: { xs: 0.75, sm: 1.5 },
                              py: { xs: 0.5, sm: 0.75 },
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                }

                return null;
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

      {enablePagination && !isGrouped && (
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[]}
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
}
