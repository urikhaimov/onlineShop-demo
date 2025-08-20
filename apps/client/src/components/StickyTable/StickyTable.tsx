import React, { useEffect, useMemo, useState } from 'react';
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
  useTheme,
  useMediaQuery,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';

import type { StickyTableProps, GroupSortMode } from './types';
import { RIGHT_GAP } from './constants';
import TableHeadSection from './TableHeadSection';
import TableBodyRows from './TableBodyRows';
import { groupAndSortData } from './utils/grouping';
import { tableFilters } from './tableFilters'; // ✅ add this
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>('count');
  const [denseMode, setDenseMode] = useState(false);

  const sortedData = useMemo(
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
    initialState: {
      grouping: groupById ? [String(groupById)] : [],
    },
    enableSorting,
    enableColumnFilters,
    filterFns: { ...tableFilters }, // ✅ add this
  });

  const rowModel = table.getRowModel();
  const isGrouped = Boolean(groupById) && table.getState().grouping.length > 0;

  useEffect(() => {
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

      <TableContainer
        component={Paper}
        className="st-scroll"
        sx={{
          borderRadius: 2,
          boxShadow: 1,
          maxHeight: bodyMaxHeight,
          overflow: 'auto',
          pr: `${RIGHT_GAP}px`,
        }}
      >
        <Table stickyHeader size={denseMode ? 'small' : 'medium'}>
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
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
}
