import React from 'react';
import {
  useReactTable,
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table';
import {
  TableContainer,
  Paper,
  Table as MuiTable,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Pagination,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renderColumnFilter } from './renderColumnFilter';
import './StickyTable.css';

interface StickyTableProps<T extends { id: string }> {
  columns: ColumnDef<T, any>[];
  data: T[];
  stickyColumnIndex?: number;
  height?: number | string;
  enableReorder?: boolean;
  onReorder?: (newData: T[]) => void;
  enablePagination?: boolean;
  rowsPerPage?: number;
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (
    updater:
      | ColumnFiltersState
      | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => void;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'move',
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </TableRow>
  );
}

export default function StickyTable<T extends { id: string }>({
  columns,
  data,
  stickyColumnIndex = 0,
  height = 500,
  enableReorder = false,
  onReorder,
  enablePagination = false,
  rowsPerPage = 10,
  sorting = [],
  onSortingChange,
  columnFilters = [],
  onColumnFiltersChange,
  enableSorting = false,
  enableColumnFilters = false,
}: StickyTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const [tableData, setTableData] = React.useState<T[]>([]);

  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  const paginatedData = enablePagination
    ? tableData.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : tableData;

  const table = useReactTable({
    data: paginatedData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange,
    onColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableColumnFilters
      ? getFilteredRowModel()
      : undefined,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tableData.findIndex((row) => row.id === active.id);
      const newIndex = tableData.findIndex((row) => row.id === over?.id);
      const newData = arrayMove(tableData, oldIndex, newIndex);
      setTableData(newData);
      onReorder?.(newData);
    }
  };

  return (
    <>
      <TableContainer
        component={Paper}
        style={{
          maxHeight: height,
          overflow: 'auto',
          border: '1px solid #e0e0e0',
        }}
      >
        <MuiTable stickyHeader sx={{ minWidth: 800 }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <TableRow>
                  {headerGroup.headers.map((header, colIndex) => (
                    <TableCell
                      key={header.id}
                      className={
                        colIndex === stickyColumnIndex
                          ? 'sticky-cell sticky-header'
                          : 'sticky-header'
                      }
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === 'asc' && ' 🔼'}
                          {header.column.getIsSorted() === 'desc' && ' 🔽'}
                        </Box>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {enableColumnFilters && (
                  <TableRow>
                    {headerGroup.headers.map((header, colIndex) => (
                      <TableCell
                        key={header.id + '_filter'}
                        className={
                          colIndex === stickyColumnIndex ? 'sticky-cell' : ''
                        }
                      >
                        {header.column.getCanFilter()
                          ? renderColumnFilter(header.column, table)
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableHead>

          <TableBody>
            {enableReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={paginatedData.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map((row) => (
                    <SortableRow key={row.id} id={row.original.id}>
                      {row.getVisibleCells().map((cell, colIndex) => (
                        <TableCell
                          key={cell.id}
                          className={
                            colIndex === stickyColumnIndex ? 'sticky-cell' : ''
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </SortableRow>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, colIndex) => (
                    <TableCell
                      key={cell.id}
                      className={
                        colIndex === stickyColumnIndex ? 'sticky-cell' : ''
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </MuiTable>
      </TableContainer>

      {enablePagination && (
        <Box mt={2} display="flex" justifyContent="center">
          <Pagination
            count={Math.ceil(tableData.length / rowsPerPage)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
          />
        </Box>
      )}
    </>
  );
}
