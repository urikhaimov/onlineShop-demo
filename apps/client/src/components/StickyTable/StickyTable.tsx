// src/components/StickyTable/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Updater,
  type Row,
  type Column,
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SwapVertIcon from '@mui/icons-material/SwapVert';

import { tableFilters } from './tableFilters';
import { renderColumnFilter } from './renderColumnFilter';

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
}

export default function StickyTable<T extends object>({
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
  enableRowExpansion = false,
  renderExpandedRow,
}: StickyTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [groupSortMode, setGroupSortMode] = useState<'count' | 'alpha'>(
    'count',
  );
  const [denseMode, setDenseMode] = useState(false);

  // Sort whole groups (when grouping is active) by count or alphabetically
  const sortedData = useMemo(() => {
    if (!groupById) return data;

    const keyName = groupById; // narrowed by guard above
    const groupMap = new Map<string, T[]>();

    for (const item of data) {
      const raw = (item as Record<string, unknown>)[keyName as string];
      const key = String((raw ?? 'Unknown') as unknown);
      const arr = groupMap.get(key);
      if (arr) {
        arr.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    const groupKeys = Array.from(groupMap.keys());
    groupKeys.sort((a, b) => {
      if (groupSortMode === 'count') {
        return groupMap.get(b)!.length - groupMap.get(a)!.length;
      }
      return a.localeCompare(b);
    });

    return groupKeys.flatMap((k) => groupMap.get(k)!);
  }, [data, groupById, groupSortMode]);

  const table = useReactTable({
    data: sortedData,
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
    filterFns: {
      ...tableFilters,
    },
  });

  const rowModel = table.getRowModel();
  const isGrouped = Boolean(groupById) && table.getState().grouping.length > 0;

  // Auto-expand top-level groups initially
  useEffect(() => {
    if (!isGrouped) return;
    const next: Record<string, boolean> = {};
    for (const r of rowModel.rows) {
      if (r.subRows.length > 0 && r.depth === 0) {
        next[r.id] = true;
      }
    }
    setExpandedGroups(next);
  }, [isGrouped, rowModel.rows]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper types & fns for column meta (relies on your module augmentation)
  type MetaOf<C extends Column<any>> = NonNullable<C['columnDef']['meta']>;

  const getStickyStyles = (meta?: MetaOf<Column<T>>) => {
    if (meta?.sticky === 'left') {
      return {
        position: 'sticky' as const,
        left: 0,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
      };
    }
    if (meta?.sticky === 'right') {
      return {
        position: 'sticky' as const,
        right: 0,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
      };
    }
    return {};
  };

  const shouldHideColumnOnMobile = (meta?: MetaOf<Column<T>>) =>
    meta?.hiddenOnMobile ? { display: { xs: 'none', sm: 'table-cell' } } : {};

  const renderRow = (row: Row<T>) => {
    const isExpanded = expandedRows[row.id] ?? false;

    return (
      <React.Fragment key={row.id}>
        <TableRow>
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as
              | MetaOf<typeof cell.column>
              | undefined;
            const stickyStyles = getStickyStyles(meta);
            const align: 'left' | 'right' | 'center' =
              meta?.align ??
              (meta?.filterVariant === 'number' ? 'right' : 'left');

            return (
              <TableCell
                key={cell.id}
                sx={{
                  ...stickyStyles,
                  ...shouldHideColumnOnMobile(meta),
                  textAlign: align,
                  verticalAlign: 'top',
                  px: denseMode ? 0.5 : 1,
                  py: denseMode ? 0.25 : 0.5,
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  wordBreak: 'break-word',
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}

          {enableRowExpansion && (
            <TableCell
              sx={{
                width: 40,
                textAlign: 'center',
                position: 'sticky',
                right: 0,
                zIndex: 3,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <IconButton size="small" onClick={() => toggleRowExpand(row.id)}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </TableCell>
          )}
        </TableRow>

        {enableRowExpansion && isExpanded && (
          <TableRow>
            <TableCell
              colSpan={columns.length + 1}
              sx={{ backgroundColor: theme.palette.grey[50], px: 2, py: 1 }}
            >
              {renderExpandedRow ? (
                renderExpandedRow(row.original)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No additional details.
                </Typography>
              )}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Stack direction="row" spacing={2} justifyContent="space-between" mb={1}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={denseMode}
              onChange={() => setDenseMode((d) => !d)}
            />
          }
          label="Dense mode"
        />

        {isGrouped && (
          <Tooltip title={`Sort groups by ${groupSortMode}`}>
            <IconButton
              sx={{ width: 'auto' }}
              onClick={() =>
                setGroupSortMode((prev) =>
                  prev === 'count' ? 'alpha' : 'count',
                )
              }
            >
              <SwapVertIcon fontSize="small" />
              <Typography variant="caption" ml={0.5}>
                {groupSortMode === 'count' ? 'Count' : 'Name'}
              </Typography>
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table stickyHeader size={denseMode ? 'small' : 'medium'}>
          <TableHead>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | MetaOf<typeof header.column>
                    | undefined;
                  const stickyStyles = getStickyStyles(meta);
                  const align: 'left' | 'right' | 'center' =
                    meta?.align ?? 'left';

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
                        backgroundColor: theme.palette.grey[50],
                        textAlign: align,
                        verticalAlign: 'top',
                        px: denseMode ? 0.5 : 1,
                        py: denseMode ? 0.25 : 0.5,
                      }}
                    >
                      <Stack
                        spacing={0.25}
                        alignItems={
                          align === 'right' ? 'flex-end' : 'flex-start'
                        }
                      >
                        <Typography variant="caption" fontWeight={600}>
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

                {enableRowExpansion && (
                  <TableCell
                    sx={{
                      top: 0,
                      zIndex: 10,
                      backgroundColor: theme.palette.grey[50],
                    }}
                  />
                )}
              </TableRow>
            ))}
          </TableHead>

          <TableBody>
            {rowModel.rows.map((row) => {
              // Group header rows
              if (row.depth === 0 && row.subRows.length > 0 && isGrouped) {
                const isOpen = expandedGroups[row.id];
                const label = groupById
                  ? String(row.getValue(String(groupById)))
                  : 'Group';

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      sx={{ backgroundColor: theme.palette.action.hover }}
                    >
                      <TableCell
                        colSpan={columns.length + (enableRowExpansion ? 1 : 0)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => toggleGroup(row.id)}
                          >
                            {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <Typography fontWeight={600}>
                            {label}{' '}
                            <Typography component="span" variant="caption">
                              ({row.subRows.length})
                            </Typography>
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {isOpen && row.subRows.map((child) => renderRow(child))}
                  </React.Fragment>
                );
              }

              // Normal top-level rows
              if (row.depth === 0) return renderRow(row);
              return null;
            })}
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
