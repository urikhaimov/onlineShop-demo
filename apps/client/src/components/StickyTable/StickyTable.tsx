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

// dnd-kit
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimation,
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
  /** Columns reorder handler: called with ordered *column ids* whenever the order changes. */
  onColumnsReorder?: (orderedColumnIds: string[]) => void;
  /** CSS class name for the drag handle element inside each row. */
  dragHandleClassName?: string;
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

  // Columns reorder callback
  onColumnsReorder,

  // Drag handle class (listeners attach to this element only in TableBodyRows)
  dragHandleClassName = 'drag-handle',
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

  // 🔹 active drag id (used to fade source row & render overlay)
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Initial column order = leaf ids in the given order
  const initialColumnOrder: ColumnOrderState = React.useMemo(() => {
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

  // Group/sort the incoming data (pure)
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

  // Emit reordered columns to parent if needed
  React.useEffect(() => {
    if (!onColumnsReorder) return;
    onColumnsReorder(columnOrder as string[]);
  }, [columnOrder, onColumnsReorder]);

  const rowModel = table.getRowModel();
  const isGrouped = Boolean(groupById) && table.getState().grouping.length > 0;

  // Expand all groups by default when grouping changes
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
  // DnD setup + visible id computation
  // ────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  /** Collect visible leaf rows:
   *  - Ungrouped: all root rows with no subRows (on the current page)
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

  // Keep the guard simple; add sort/filter guards later if you want
  const canDragRows =
    Boolean(onReorder) && !disableDrag && visibleIds.length > 0;

  const handleRowDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleRowDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);

    if (!canDragRows || !over || active.id === over.id) return;

    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const newIds = arrayMove(visibleIds, oldIndex, newIndex);
    onReorder?.(newIds);
  };

  // 🔹 Overlay that always shows product name (fallback: title → first useful cell)
  const renderOverlay = React.useCallback(() => {
    if (!activeId) return null;
    const row = visibleLeafRows.find((r) => String(r.id) === activeId);
    if (!row) return null;

    const original = row.original as any;
    const label: string =
      (original?.name && String(original.name)) ||
      (original?.title && String(original.title)) ||
      // fallback: read "name" column if present
      ((row as any)
        .getAllCells?.()
        ?.find?.((c: any) => c.column?.id === 'name')
        ?.getValue?.() as string) ||
      'Product';

    return (
      <div className="st-ghost">
        <div className="st-ghost-primary">{label}</div>
      </div>
    );
  }, [activeId, visibleLeafRows]);

  // Table shell
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
          enableRowDrag={canDragRows}
          dragHandleClassName={dragHandleClassName}
          /** fade the source row while dragging */
          activeId={activeId}
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
        <DndContext
          sensors={sensors}
          onDragStart={handleRowDragStart}
          onDragEnd={handleRowDragEnd}
        >
          <SortableContext
            items={visibleIds}
            strategy={verticalListSortingStrategy}
          >
            {tableShell}
          </SortableContext>

          {/* Smooth cursor-follow ghost */}
          <DragOverlay dropAnimation={defaultDropAnimation}>
            {renderOverlay()}
          </DragOverlay>
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
