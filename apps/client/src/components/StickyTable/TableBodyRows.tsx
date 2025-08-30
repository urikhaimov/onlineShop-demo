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
import { CSS } from '@dnd-kit/utilities';

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

  /** Enable drag on leaf rows (DnD context is managed by StickyTable) */
  enableRowDrag?: boolean;
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
    // Ignore error
  }
  const firstChild = row.subRows?.[0];
  const original = firstChild?.original as T | undefined;
  if (original && Object.prototype.hasOwnProperty.call(original, colId)) {
    const value = (original as Record<string, unknown>)[colId];
    if (value !== undefined && value !== null) return String(value);
  }
  return 'Group';
}

/** Normalize any SxProps to a flat array of items (no nested arrays). */
function toSxArray(
  sx: SxProps<Theme> | undefined,
): ReadonlyArray<
  ((theme: Theme) => Record<string, unknown>) | Record<string, unknown>
> {
  if (!sx) return [];
  if (Array.isArray(sx)) {
    const flat: Array<
      ((theme: Theme) => Record<string, unknown>) | Record<string, unknown>
    > = [];
    for (const item of sx) {
      if (!item) continue;
      if (typeof item === 'function')
        flat.push(item as (t: Theme) => Record<string, unknown>);
      else flat.push(item as Record<string, unknown>);
    }
    return flat;
  }
  if (typeof sx === 'function')
    return [sx as (t: Theme) => Record<string, unknown>];
  return [sx as Record<string, unknown>];
}

/** Child component so hooks are not called conditionally in the parent. */
function LeafRow<T extends object>({
  row,
  columnsLength,
  enableRowExpansion,
  renderExpandedRow,
  denseMode,
  spacingScale,
  enableRowDrag,
  isExpanded,
  toggleRowExpand,
}: {
  row: ReactRow<T>;
  columnsLength: number;
  enableRowExpansion: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  denseMode: boolean;
  spacingScale: number;
  enableRowDrag: boolean;
  isExpanded: boolean;
  toggleRowExpand: (id: string) => void;
}) {
  const theme = useTheme();

  // Always call the hook; only apply its results if dragging is enabled.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(row.id) });

  const dragStyle = enableRowDrag
    ? {
        cursor: 'grab',
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.85 : 1,
      }
    : {};

  return (
    <>
      <TableRow
        ref={enableRowDrag ? setNodeRef : undefined}
        {...(enableRowDrag ? attributes : {})}
        {...(enableRowDrag ? listeners : {})}
        sx={dragStyle as any}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
          const stickySx = toSxArray(getStickyStyles(theme, meta));
          const hiddenSx = toSxArray(responsiveVisibility(meta));
          return (
            <TableCell
              key={cell.id}
              sx={[
                ...stickySx,
                ...hiddenSx,
                () => ({
                  textAlign: 'left',
                  px: (denseMode ? 0.5 : 1) * spacingScale,
                  py: (denseMode ? 0.25 : 0.5) * spacingScale,
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  backgroundColor: 'background.paper',
                  borderColor: 'divider',
                }),
              ]}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}

        {enableRowExpansion && (
          <TableCell
            sx={[
              {
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
              },
            ]}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleRowExpand(row.id);
              }}
              // prevent DnD activator from swallowing click
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
                      isExpanded={isExpanded}
                      toggleRowExpand={toggleRowExpand}
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
              isExpanded={isExpanded}
              toggleRowExpand={toggleRowExpand}
            />
          );
        }

        return null;
      })}
    </TableBody>
  );
}
