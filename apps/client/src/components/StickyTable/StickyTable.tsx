// StickyTable.tsx — Mobile Optimized Final Version
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
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isColumnFiltered = (id: string) =>
    columnFilters.some((f) => f.id === id && !!f.value);

  const getStickyStyles = (meta?: any) => {
    if (meta?.sticky === 'left')
      return { position: 'sticky', left: 0, zIndex: 1 };
    if (meta?.sticky === 'right')
      return { position: 'sticky', right: 0, zIndex: 1 };
    return {};
  };

  const shouldHideColumnOnMobile = (meta?: any) =>
    meta?.hiddenOnMobile ? { display: { xs: 'none', sm: 'table-cell' } } : {};

  const renderRow = (rowCells: any[]) => (
    <TableRow>
      {rowCells.map((cell) => {
        const meta = cell.column.columnDef.meta;
        const stickyStyles = getStickyStyles(meta);
        return (
          <TableCell
            key={cell.id}
            sx={{
              ...stickyStyles,
              ...shouldHideColumnOnMobile(meta),
              textAlign:
                meta?.align ??
                (meta?.filterVariant === 'number' ? 'right' : 'left'),
              verticalAlign: 'top',
              px: { xs: 0.25, sm: 1 },
              py: { xs: 0.25, sm: 0.5 },
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              wordBreak: 'break-word',
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );

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
                  const meta = header.column.columnDef.meta;
                  const stickyStyles = getStickyStyles(meta);
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        ...stickyStyles,
                        ...shouldHideColumnOnMobile(meta),
                        top: 0,
                        zIndex: 10,
                        minWidth: {
                          xs: 60,
                          sm: header.column.columnDef.size ?? 100,
                        },
                        maxWidth: {
                          xs: 80,
                          sm: header.column.columnDef.size ?? 200,
                        },
                        backgroundColor: isColumnFiltered(header.column.id)
                          ? theme.palette.action.selected
                          : theme.palette.grey[50],
                        textAlign:
                          meta?.align ??
                          (meta?.filterVariant === 'number' ? 'right' : 'left'),
                        verticalAlign: 'top',
                        px: { xs: 0.25, sm: 1 },
                        py: { xs: 0.25, sm: 0.5 },
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        wordBreak: 'break-word',
                      }}
                    >
                      <Stack
                        spacing={0.25}
                        alignItems="flex-start"
                        justifyContent="flex-start"
                      >
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
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
            {rowModel.rows.map((row) => {
              if (row.depth === 0 && row.subRows.length > 0 && isGrouped) {
                const isOpen = expandedGroups[row.id];
                const label = String(row.getValue(groupById as string));
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      sx={{
                        backgroundColor: theme.palette.action.hover,
                        position: 'sticky',
                        top: 40,
                        zIndex: 5,
                      }}
                    >
                      <TableCell colSpan={columns.length}>
                        <Stack direction="row" alignItems="center" spacing={1}>
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
                      row.subRows.map((child) =>
                        renderRow(child.getVisibleCells()),
                      )}
                  </React.Fragment>
                );
              }

              if (row.depth === 0) return renderRow(row.getVisibleCells());
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
