// src/components/StickyTable/TableBodyRows.tsx
import * as React from 'react';
import {
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Stack,
  IconButton,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type {
  Table as ReactTable,
  Row as ReactRow,
} from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';

import { EXPAND_COL_WIDTH, RIGHT_GAP } from './constants';
import { getStickyStyles, responsiveVisibility } from './utils/styles';
import type { ColumnMeta } from './utils/columnMeta';
import { useThemeStore } from '../../stores/useThemeStore';

// dnd-kit
import { useSortable } from '@dnd-kit/sortable';

type Props<T extends object> = {
  table: ReactTable<T>;
  columnsLength: number;
  groupById?: keyof T;
  isGrouped: boolean;
  enableRowExpansion: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;

  denseMode: boolean;

  expandedGroups: Record<string, boolean>;
  toggleGroup: (id: string) => void;

  expandedRows: Record<string, boolean>;
  toggleRowExpand: (id: string) => void;

  /** Enable drag on leaf rows (DnD context is managed by StickyTable). */
  enableRowDrag?: boolean;

  /** Optional class for the handle button. */
  dragHandleClassName?: string;

  /** 🔹 NEW: id of the row currently being dragged (for fading source row). */
  activeId?: string | null;
};

function getGroupLabelSafe<T extends object>(
  row: ReactRow<T>,
  groupById?: keyof T,
): string {
  if (!groupById) return 'Group';
  const colId = String(groupById);
  try {
    const v = row.getValue(colId);
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  } catch {
    // ignore
  }
  const firstChild = row.subRows?.[0];
  const original = firstChild?.original as T | undefined;
  if (original && Object.prototype.hasOwnProperty.call(original, colId)) {
    const value = (original as Record<string, unknown>)[colId];
    if (value !== undefined && value !== null) return String(value);
  }
  return 'Group';
}

function toSxArray(
  sx: SxProps<Theme> | undefined,
): ReadonlyArray<
  ((theme: Theme) => Record<string, unknown>) | Record<string, unknown>
> {
  if (!sx) return [];
  if (Array.isArray(sx)) return sx.filter(Boolean) as any[];
  return [sx as any];
}

/** Leaf row (no transforms on <tr>; listeners sit on the handle button). */
function LeafRow<T extends object>({
  row,
  columnsLength,
  enableRowExpansion,
  renderExpandedRow,
  denseMode,
  spacingScale,
  enableRowDrag = false,
  dragHandleClassName = 'drag-handle',
  isExpanded,
  toggleRowExpand,
  /** NEW: fade when active */
  active = false,
}: {
  row: ReactRow<T>;
  columnsLength: number;
  enableRowExpansion: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  denseMode: boolean;
  spacingScale: number;
  enableRowDrag?: boolean;
  dragHandleClassName?: string;
  isExpanded: boolean;
  toggleRowExpand: (id: string) => void;
  active?: boolean;
}) {
  const theme = useTheme();

  // Don’t use transform on <tr>; just provide attributes for a11y and listeners on handle
  const { attributes, listeners, setNodeRef } = useSortable({
    id: String(row.id),
    disabled: !enableRowDrag,
  });

  return (
    <>
      <TableRow
        ref={setNodeRef}
        {...(enableRowDrag ? attributes : {})}
        hover
        sx={{ opacity: active ? 0.5 : 1, transition: 'opacity 120ms ease' }}
      >
        {row.getVisibleCells().map((cell) => {
          // Special left sticky reorder column: render the grip
          if (cell.column.id === '__reorder__') {
            const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
            const stickySx = toSxArray(getStickyStyles(theme, meta));
            const hiddenSx = toSxArray(responsiveVisibility(meta));
            return (
              <TableCell
                key={cell.id}
                padding="checkbox"
                sx={[
                  ...stickySx,
                  ...hiddenSx,
                  {
                    width: 36,
                    minWidth: 36,
                    maxWidth: 36,
                    textAlign: 'center',
                    backgroundColor: 'background.paper',
                    borderRight: 1,
                    borderColor: 'divider',
                    px: 0.25 * spacingScale,
                    zIndex: 4,
                  },
                ]}
              >
                <IconButton
                  size="small"
                  className={dragHandleClassName}
                  sx={{
                    cursor: enableRowDrag ? 'grab !important' : 'default',
                    '&:active': {
                      cursor: enableRowDrag ? 'grabbing !important' : 'default',
                    },
                    touchAction: 'none',
                  }}
                  aria-label="Drag row"
                  disabled={!enableRowDrag}
                  {...(enableRowDrag ? listeners : {})}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </TableCell>
            );
          }

          // Normal data cells
          const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
          const stickySx = toSxArray(getStickyStyles(theme, meta));
          const hiddenSx = toSxArray(responsiveVisibility(meta));
          return (
            <TableCell
              key={cell.id}
              sx={[
                ...stickySx,
                ...hiddenSx,
                {
                  textAlign: 'left',
                  px: (denseMode ? 0.5 : 1) * spacingScale,
                  py: (denseMode ? 0.25 : 0.5) * spacingScale,
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  backgroundColor: 'background.paper',
                  borderColor: 'divider',
                },
              ]}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}

        {/* Right-sticky expand cell */}
        {enableRowExpansion && (
          <TableCell
            sx={{
              width: EXPAND_COL_WIDTH,
              minWidth: EXPAND_COL_WIDTH,
              maxWidth: EXPAND_COL_WIDTH,
              textAlign: 'center',
              position: 'sticky',
              right: RIGHT_GAP,
              zIndex: 3,
              backgroundColor: 'background.paper',
              borderLeft: 1,
              borderColor: 'divider',
              px: 0,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleRowExpand(row.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              sx={{ p: 0.25 }}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </TableCell>
        )}
      </TableRow>

      {/* Expanded content row */}
      {enableRowExpansion && isExpanded && (
        <TableRow>
          <TableCell
            colSpan={columnsLength + (enableRowExpansion ? 1 : 0)}
            sx={[
              {
                backgroundColor: 'action.hover',
                borderTop: 1,
                borderColor: 'divider',
              },
              { px: 2 * spacingScale, py: 1 * spacingScale },
            ]}
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
    </>
  );
}

export default function TableBodyRows<T extends object>({
  table,
  columnsLength,
  groupById,
  isGrouped,
  enableRowExpansion,
  renderExpandedRow,
  denseMode,
  expandedGroups,
  toggleGroup,
  expandedRows,
  toggleRowExpand,
  enableRowDrag = false,
  dragHandleClassName = 'drag-handle',
  /** NEW: from StickyTable DragOverlay */
  activeId = null,
}: Props<T>) {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();
  const spacingScale = themeSettings?.spacingScale ?? 1;

  const rowModel = table.getRowModel();

  return (
    <TableBody
      sx={[
        {
          '& .MuiTableCell-root': {
            verticalAlign: 'middle',
            borderColor: 'divider',
          },
        },
      ]}
    >
      {rowModel.rows.map((row) => {
        // Group headers
        if (row.depth === 0 && row.subRows.length > 0 && isGrouped) {
          const isOpen = expandedGroups[row.id];
          const label = getGroupLabelSafe(row, groupById);

          return (
            <React.Fragment key={row.id}>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell
                  colSpan={columnsLength + (enableRowExpansion ? 1 : 0)}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => toggleGroup(row.id)}
                      aria-label={isOpen ? 'Collapse group' : 'Expand group'}
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

              {isOpen &&
                row.subRows.map((child) => {
                  const isExpanded = expandedRows[child.id] ?? false;
                  return (
                    <LeafRow<T>
                      key={child.id}
                      row={child}
                      columnsLength={columnsLength}
                      enableRowExpansion={enableRowExpansion}
                      renderExpandedRow={renderExpandedRow}
                      denseMode={denseMode}
                      spacingScale={spacingScale}
                      enableRowDrag={enableRowDrag}
                      dragHandleClassName={dragHandleClassName}
                      isExpanded={isExpanded}
                      toggleRowExpand={toggleRowExpand}
                      active={activeId === String(child.id)}
                    />
                  );
                })}
            </React.Fragment>
          );
        }

        // Normal top-level leaf rows
        if (row.depth === 0) {
          const isExpanded = expandedRows[row.id] ?? false;
          return (
            <LeafRow<T>
              key={row.id}
              row={row}
              columnsLength={columnsLength}
              enableRowExpansion={enableRowExpansion}
              renderExpandedRow={renderExpandedRow}
              denseMode={denseMode}
              spacingScale={spacingScale}
              enableRowDrag={enableRowDrag}
              dragHandleClassName={dragHandleClassName}
              isExpanded={isExpanded}
              toggleRowExpand={toggleRowExpand}
              active={activeId === String(row.id)}
            />
          );
        }

        return null;
      })}
    </TableBody>
  );
}
