import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
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
  enableRowExpansion?: boolean;
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
  enableRowExpansion = false,
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

  const sortedData = useMemo(() => {
    if (!groupById) return data;
    const groupMap: Record<string, T[]> = {};
    for (const item of data) {
      const key = String(item[groupById] ?? 'Unknown');
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(item);
    }
    const groupKeys = Object.keys(groupMap);
    groupKeys.sort((a, b) => {
      if (groupSortMode === 'count') {
        return groupMap[b].length - groupMap[a].length;
      } else {
        return a.localeCompare(b);
      }
    });
    return groupKeys.flatMap((k) => groupMap[k]);
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

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStickyStyles = (meta?: any) => {
    if (meta?.sticky === 'left') {
      return {
        position: 'sticky',
        left: 0,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
      };
    }
    if (meta?.sticky === 'right') {
      return {
        position: 'sticky',
        right: 0,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
      };
    }
    return {};
  };

  const shouldHideColumnOnMobile = (meta?: any) =>
    meta?.hiddenOnMobile ? { display: { xs: 'none', sm: 'table-cell' } } : {};

  const renderRow = (row: any) => {
    const isExpanded = expandedRows[row.id] ?? false;
    return (
      <React.Fragment key={row.id}>
        <TableRow>
          {row.getVisibleCells().map((cell: any) => {
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
              <Typography variant="body2" color="text.secondary">
                {row.original.description || 'No description provided.'}
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
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

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: 1, maxHeight: 'calc(100vh - 200px)' }}
      >
        <Table stickyHeader size={denseMode ? 'small' : 'medium'}>
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
                        backgroundColor: theme.palette.grey[50],
                        textAlign:
                          meta?.align ??
                          (meta?.filterVariant === 'number' ? 'right' : 'left'),
                        verticalAlign: 'top',
                        px: denseMode ? 0.5 : 1,
                        py: denseMode ? 0.25 : 0.5,
                      }}
                    >
                      <Stack
                        spacing={0.25}
                        alignItems={
                          meta?.align === 'right' ? 'flex-end' : 'flex-start'
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
              if (row.depth === 0 && row.subRows.length > 0 && isGrouped) {
                const isOpen = expandedGroups[row.id];
                const label = String(row.getValue(groupById as string));
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
