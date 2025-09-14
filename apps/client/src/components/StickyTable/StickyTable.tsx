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

type ControlledPaginationProps = {
  pageIndex?: number; // 0-based (controlled)
  totalRows?: number; // server-known total (enables Next when applicable)
  onPageChange?: (nextPageIndex: number) => void;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (size: number) => void;
};

type StickyTableWithDnDProps<T extends object> = StickyTableProps<T> &
  ControlledPaginationProps & {
    onReorder?: (orderedIds: string[]) => void;
    getRowId?: (row: T) => string;
    disableDrag?: boolean;
    onColumnsReorder?: (orderedColumnIds: string[]) => void;
    dragHandleClassName?: string;
    renderGroupHeader?: (args: {
      value: unknown;
      rows: T[];
      expanded: boolean;
      toggle: () => void;
    }) => React.ReactNode;
    /** test id applied to the <Table> element */
    tableTestId?: string;
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

  // controlled pagination
  pageIndex,
  totalRows,
  onPageChange,
  rowsPerPageOptions = [],
  onRowsPerPageChange,

  // DnD
  onReorder,
  getRowId,
  disableDrag = false,

  onColumnsReorder,
  dragHandleClassName = 'drag-handle',

  renderGroupHeader,

  // test id
  tableTestId,
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
  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  const sortedData = React.useMemo(
    () => groupAndSortData<T>(data, groupById, groupSortMode),
    [data, groupById, groupSortMode],
  );

  const isGrouped = Boolean(groupById);
  const paginationEnabled = enablePagination && !isGrouped;
  const controlledPagination =
    paginationEnabled && typeof pageIndex === 'number';

  const table = useReactTable({
    data: sortedData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
      ...(paginationEnabled
        ? {
            pagination: {
              pageIndex: controlledPagination ? pageIndex! : 0,
              pageSize: rowsPerPage,
            },
          }
        : {}),
    },
    onSortingChange,
    onColumnFiltersChange,
    onColumnOrderChange: setColumnOrder,
    ...(paginationEnabled && !controlledPagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    manualPagination: controlledPagination,
    enableSorting,
    enableColumnFilters,
    filterFns: { ...tableFilters },
    getRowId: (row: T, idx: number) =>
      getRowId ? getRowId(row) : ((row as any).id ?? String(idx)),
    ...(controlledPagination && onPageChange
      ? {
          onPaginationChange: (updater: any) => {
            const prev = { pageIndex: pageIndex!, pageSize: rowsPerPage };
            const next =
              typeof updater === 'function' ? updater(prev) : updater;
            if (
              typeof next?.pageIndex === 'number' &&
              next.pageIndex !== pageIndex
            )
              onPageChange(next.pageIndex);
            if (
              typeof next?.pageSize === 'number' &&
              next.pageSize !== rowsPerPage &&
              onRowsPerPageChange
            ) {
              onRowsPerPageChange(next.pageSize);
            }
          },
        }
      : {}),
  });

  React.useEffect(() => {
    if (!onColumnsReorder) return;
    onColumnsReorder(columnOrder as string[]);
  }, [columnOrder, onColumnsReorder]);

  const rowModel = table.getRowModel();

  React.useEffect(() => {
    if (!isGrouped) return;
    const next: Record<string, boolean> = {};
    for (const r of rowModel.rows) {
      if (r.subRows.length > 0 && r.depth === 0) next[r.id] = true;
    }
    setExpandedGroups(next);
  }, [isGrouped, rowModel.rows]);

  const toggleGroup = (id: string) =>
    setExpandedGroups((p) => ({ ...p, [id]: !p[id] }));
  const toggleRowExpand = (id: string) =>
    setExpandedRows((p) => ({ ...p, [id]: !p[id] }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visibleLeafRows = React.useMemo(() => {
    const roots = table.getRowModel().rows;
    if (!isGrouped) return roots.filter((r) => r.subRows.length === 0);
    const leafs: typeof roots = [];
    for (const group of roots) {
      if (group.depth !== 0 || group.subRows.length === 0) continue;
      if (!expandedGroups[group.id]) continue;
      for (const child of group.subRows)
        if (child.subRows.length === 0) leafs.push(child);
    }
    return leafs;
  }, [table, isGrouped, expandedGroups]);

  const visibleIds = React.useMemo(
    () => visibleLeafRows.map((r) => String(r.id)),
    [visibleLeafRows],
  );

  const canDragRows =
    Boolean(onReorder) && !disableDrag && visibleIds.length > 0;

  const handleRowDragStart = (e: DragStartEvent) =>
    setActiveId(String(e.active.id));

  const handleRowDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!canDragRows || !over || active.id === over.id) return;
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder?.(arrayMove(visibleIds, oldIndex, newIndex));
  };

  const renderOverlay = React.useCallback(() => {
    if (!activeId) return null;
    const row = visibleLeafRows.find((r) => String(r.id) === activeId);
    if (!row) return null;
    const original = row.original as any;
    const label: string =
      (original?.name && String(original.name)) ||
      (original?.title && String(original.title)) ||
      ((row as any)
        .getAllCells?.()
        ?.find?.((c: any) => c.column?.id === 'name')
        ?.getValue?.() as string) ||
      'Row';
    return (
      <div className="st-ghost">
        <div className="st-ghost-primary">{label}</div>
      </div>
    );
  }, [activeId, visibleLeafRows]);

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
        aria-label="table"
        data-testid={tableTestId || undefined}
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
          renderGroupHeader={renderGroupHeader}
          activeId={activeId}
        />
      </Table>
    </TableContainer>
  );

  const clientCount = table.getFilteredRowModel().rows.length;

  // If server total provided, prefer it, otherwise fall back to client count
  const paginationCount = controlledPagination
    ? typeof totalRows === 'number'
      ? totalRows
      : clientCount
    : clientCount;

  const currentPage = controlledPagination
    ? Math.max(0, pageIndex!)
    : table.getState().pagination.pageIndex;

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
          <DragOverlay dropAnimation={defaultDropAnimation}>
            {renderOverlay()}
          </DragOverlay>
        </DndContext>
      ) : (
        tableShell
      )}

      {paginationEnabled && !isGrouped && (
        <TablePagination
          component="div"
          count={paginationCount}
          page={currentPage}
          onPageChange={(_, next) => {
            if (controlledPagination && onPageChange) onPageChange(next);
            else table.setPageIndex(next);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={
            onRowsPerPageChange
              ? (e) => onRowsPerPageChange(parseInt(e.target.value, 10))
              : undefined
          }
          rowsPerPageOptions={
            rowsPerPageOptions.length ? rowsPerPageOptions : []
          }
          sx={(t) => ({
            mt: 1,
            bgcolor: (t.vars || t).palette.background.paper,
            border: `1px solid ${(t.vars || t).palette.divider}`,
            borderRadius: 1,
          })}
          // Stable ARIA labels for tests
          getItemAriaLabel={(type) => {
            switch (type) {
              case 'next':
                return 'Go to next page';
              case 'previous':
                return 'Go to previous page';
              case 'first':
                return 'Go to first page';
              case 'last':
                return 'Go to last page';
              default:
                return '';
            }
          }}
          // Ensure pointer events are not blocked when enabled
          backIconButtonProps={{
            'aria-label': 'Go to previous page',
            sx: { pointerEvents: 'auto' },
          }}
          nextIconButtonProps={{
            'aria-label': 'Go to next page',
            sx: { pointerEvents: 'auto' },
          }}
        />
      )}
    </Box>
  );
}
