// src/components/sticky-table/StickyTable.tsx
import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
} from '@tanstack/react-table';
import {
  Paper,
  Table,
  TableContainer,
  TablePagination,
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';

import type { StickyTableProps, GroupSortMode } from './types';
import { RIGHT_GAP } from './constants';
import TableHeadSection from './TableHeadSection';
import TableBodyRows from './TableBodyRows';
import { groupAndSortData } from './utils/grouping';
import { tableFilters } from './tableFilters';
import './sticky-table.css';

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
  bodyMaxHeight = 480,
}: StickyTableProps<T>) {
  const theme = useTheme();

  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});
  const [groupSortMode, setGroupSortMode] =
    React.useState<GroupSortMode>('count');
  const [denseMode, setDenseMode] = React.useState(false);

  const sortedData = React.useMemo(
    () => groupAndSortData<T>(data, groupById, groupSortMode),
    [data, groupById, groupSortMode],
  );

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
    initialState: { grouping: groupById ? [String(groupById)] : [] },
    enableSorting,
    enableColumnFilters,
    filterFns: { ...tableFilters },
  });

  const rowModel = table.getRowModel();
  const isGrouped = Boolean(groupById) && table.getState().grouping.length > 0;

  React.useEffect(() => {
    if (!isGrouped) return;
    const next: Record<string, boolean> = {};
    for (const r of rowModel.rows) {
      if (r.subRows.length > 0 && r.depth === 0) next[r.id] = true;
    }
    setExpandedGroups(next);
  }, [isGrouped, rowModel.rows]);

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleRowExpand = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

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
              onClick={() =>
                setGroupSortMode((prev) =>
                  prev === 'count' ? 'alpha' : 'count',
                )
              }
              sx={(t) => ({
                color: (t.vars || t).palette.text.secondary,
                '&:hover': {
                  backgroundColor: (t.vars || t).palette.action.hover,
                },
              })}
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
        className="st-scroll"
        elevation={0}
        sx={(t) => ({
          borderRadius: 2,
          maxHeight: bodyMaxHeight,
          overflow: 'auto',
          pr: `${RIGHT_GAP}px`,
          bgcolor: (t.vars || t).palette.background.paper,
          border: `1px solid ${(t.vars || t).palette.divider}`,
        })}
      >
        <Table
          stickyHeader
          size={denseMode ? 'small' : 'medium'}
          sx={(t) => ({
            // sticky header cells & dividers follow the palette
            '& .MuiTableCell-stickyHeader': {
              backgroundColor: (t.vars || t).palette.background.paper,
              color: (t.vars || t).palette.text.secondary,
              borderBottom: `1px solid ${(t.vars || t).palette.divider}`,
              // keep your helper class working if you use it
              '&.sticky-header': {
                background: (t.vars || t).palette.background.paper,
              },
            },
            // normal cell borders too
            '& .MuiTableCell-root': {
              borderColor: (t.vars || t).palette.divider,
            },
          })}
        >
          <TableHeadSection<T>
            table={table}
            enableColumnFilters={enableColumnFilters}
            enableRowExpansion={enableRowExpansion}
            denseMode={denseMode}
          />
          <TableBodyRows<T>
            table={table}
            columnsLength={columns.length}
            groupById={groupById}
            isGrouped={isGrouped}
            enableRowExpansion={enableRowExpansion}
            renderExpandedRow={renderExpandedRow}
            denseMode={denseMode}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            expandedRows={expandedRows}
            toggleRowExpand={toggleRowExpand}
          />
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
          sx={(t) => ({
            mt: 1,
            bgcolor: (t.vars || t).palette.background.paper,
            border: `1px solid ${(t.vars || t).palette.divider}`,
            borderRadius: 1,
          })}
        />
      )}
    </Box>
  );
}
