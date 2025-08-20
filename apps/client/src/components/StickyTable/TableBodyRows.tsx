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
};

function getGroupLabelSafe<T extends object>(
  row: ReactRow<T>,
  groupById?: keyof T,
): string {
  if (!groupById) return 'Group';
  const colId = String(groupById);

  // 1) Try the grouped value
  try {
    const v = row.getValue(colId);
    if (v !== undefined && v !== null && String(v).length > 0) {
      return String(v);
    }
  } catch {
    /* ignore */
  }

  // 2) Fallback to first child's original value
  const firstChild = row.subRows?.[0];
  const original = firstChild?.original as any;
  if (original && Object.prototype.hasOwnProperty.call(original, colId)) {
    const v = original[colId];
    if (v !== undefined && v !== null) return String(v);
  }

  // 3) Generic
  return 'Group';
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
}: Props<T>) {
  const theme = useTheme();
  const rowModel = table.getRowModel();

  const renderRow = (row: ReactRow<T>) => {
    const isExpanded = expandedRows[row.id] ?? false;

    return (
      <React.Fragment key={row.id}>
        <TableRow>
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
            const stickySx = getStickyStyles(theme, meta);
            const hiddenSx = responsiveVisibility(meta);

            return (
              <TableCell
                key={cell.id}
                sx={(th) => ({
                  // merge precomputed style objects (cast to any to satisfy TS when helpers return SxProps)
                  ...(stickySx as any),
                  ...(hiddenSx as any),

                  textAlign: 'left',
                  px: denseMode ? 0.5 : 1,
                  py: denseMode ? 0.25 : 0.5,

                  // responsive white-space without array form
                  whiteSpace: 'nowrap',
                  [th.breakpoints.down('sm')]: { whiteSpace: 'normal' },

                  // robust wrapping for long strings/IDs
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                })}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}

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
                backgroundColor: theme.palette.background.paper,
                px: 0,
              }}
            >
              <IconButton
                size="small"
                onClick={() => toggleRowExpand(row.id)}
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
              colSpan={columnsLength + 1}
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
    <TableBody sx={{ '& .MuiTableCell-root': { verticalAlign: 'middle' } }}>
      {rowModel.rows.map((row) => {
        // Group headers
        if (row.depth === 0 && row.subRows.length > 0 && isGrouped) {
          const isOpen = expandedGroups[row.id];
          const label = getGroupLabelSafe(row, groupById);

          return (
            <React.Fragment key={row.id}>
              <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
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

              {isOpen && row.subRows.map((child) => renderRow(child))}
            </React.Fragment>
          );
        }

        // Normal top-level rows
        if (row.depth === 0) return renderRow(row);
        return null;
      })}
    </TableBody>
  );
}
