// src/components/StickyTable/StickyTable.tsx
import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  type ColumnOrderState,
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
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';

import type { StickyTableProps, GroupSortMode } from './types';
import { RIGHT_GAP } from './constants';
import TableHeadSection from './TableHeadSection';
import TableBodyRows from './TableBodyRows';
import { groupAndSortData } from './utils/grouping';
import { tableFilters } from './tableFilters';
import './sticky-table.css';

// dnd-kit (for row reordering)
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

type StickyTableWithDnDProps<T extends object> = StickyTableProps<T> & {
  /** Called with the *visible* row IDs after a drop (top → bottom). */
  onReorder?: (orderedIds: string[]) => void;
  /** Optional: map a row to its unique string ID (defaults to (row as any).id). */
  getRowId?: (row: T) => string;
  /** Disable row drag explicitly (e.g., while persisting). */
  disableDrag?: boolean;

  /** 🔹 Columns reorder handler: called with ordered *column ids* whenever the order changes. */
  onColumnsReorder?: (orderedColumnIds: string[]) => void;
};

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

  // DnD props (rows)
  onReorder,
  getRowId,
  disableDrag = false,

  // 🔹 Columns reorder callback
  onColumnsReorder,
}: StickyTableWithDnDProps<T>) {
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});
  const [groupSortMode, setGroupSortMode] =
    React.useState<GroupSortMode>('count');
  const [denseMode, setDenseMode] = React.useState(false);

  // Build initial column order from the provided columns (leaf, visible order)
  const initialColumnOrder: ColumnOrderState = React.useMemo(() => {
    // columns can be nested; TanStack wants leaf ids (column.id or accessorKey)
    const collectIds = (cols: any[], out: string[]) => {
      for (const c of cols) {
        if (c.columns) collectIds(c.columns, out);
        else {
          const id = c.id ?? c.accessorKey ?? c.accessorFn?.name;
          if (id) out.push(String(id));
        }
      }
      return out;
    };
    return collectIds(columns as any[], []);
  }, [columns]);

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(initialColumnOrder);

  // Group/sort the incoming data (pure; DnD acts on the rendered order).
  const sortedData = React.useMemo(
    () => groupAndSortData<T>(data, groupById, groupSortMode),
    [data, groupById, groupSortMode],
  );

  const table = useReactTable({
    data: sortedData,
    columns,
    state: { sorting, columnFilters, columnOrder },
    onSortingChange,
    onColumnFiltersChange,
    // 🔹 keep columnOrder in sync
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    manualGrouping: false,
    initialState: { grouping: groupById ? [String(groupById)] : [] },
    enableSorting,
    enableColumnFilters,
    filterFns: { ...tableFilters },
    // Stable row IDs
    getRowId: (row: T, idx) =>
      getRowId ? getRowId(row) : ((row as any).id ?? String(idx)),
  });

  // 🔹 Emit to parent whenever the column order changes
  React.useEffect(() => {
    if (!onColumnsReorder) return;
    onColumnsReorder(columnOrder as string[]);
  }, [columnOrder, onColumnsReorder]);

  const rowModel = table.getRowModel();
  const isGrouped = Boolean(groupById) && table.getState().grouping.length > 0;

  // Expand all groups by default (first render or when groups change)
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

  // ────────────────────────────────────────────────
  // DnD setup: compute *visible leaf rows* in render order (for row drag)
  // ────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor));

  /** Collect visible leaf rows:
   *  - Ungrouped: all root rows with no subRows
   *  - Grouped: leaf children inside groups that are currently expanded
   */
  const visibleLeafRows = React.useMemo(() => {
    const roots = table.getRowModel().rows;

    if (!isGrouped) return roots.filter((r) => r.subRows.length === 0);

    const leafs: typeof roots = [];
    for (const group of roots) {
      if (group.depth !== 0 || group.subRows.length === 0) continue;
      if (!expandedGroups[group.id]) continue;
      for (const child of group.subRows) {
        if (child.subRows.length === 0) leafs.push(child);
      }
    }
    return leafs;
  }, [table, isGrouped, expandedGroups]);

  // IDs for SortableContext; must match useSortable id in TableBodyRows
  const visibleIds = React.useMemo(
    () => visibleLeafRows.map((r) => String(r.id)),
    [visibleLeafRows],
  );

  const canDragRows =
    Boolean(onReorder) &&
    !disableDrag &&
    visibleIds.length > 0 &&
    (sorting?.length ?? 0) === 0 &&
    (columnFilters?.length ?? 0) === 0;

  const handleRowDragEnd = (e: DragEndEvent) => {
    if (!canDragRows) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const newIds = arrayMove(visibleIds, oldIndex, newIndex);
    onReorder?.(newIds);
  };

  // ────────────────────────────────────────────────
  // Table shell
  // ────────────────────────────────────────────────
  const tableShell = (
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
          '& .MuiTableCell-stickyHeader': {
            backgroundColor: (t.vars || t).palette.background.paper,
            color: (t.vars || t).palette.text.secondary,
            borderBottom: `1px solid ${(t.vars || t).palette.divider}`,
            '&.sticky-header': {
              background: (t.vars || t).palette.background.paper,
            },
          },
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
          /**
           * If you implement header drag in TableHeadSection, call:
           * table.setColumnOrder(newOrderedIds);
           * This component will then emit onColumnsReorder for you.
           */
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
          // Rows attach useSortable when true
          enableRowDrag={canDragRows}
        />
      </Table>
    </TableContainer>
  );

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

      {canDragRows ? (
        <DndContext sensors={sensors} onDragEnd={handleRowDragEnd}>
          <SortableContext
            items={visibleIds}
            strategy={verticalListSortingStrategy}
          >
            {tableShell}
          </SortableContext>
        </DndContext>
      ) : (
        tableShell
      )}

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
