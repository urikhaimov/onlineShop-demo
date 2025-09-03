// src/components/StickyTable/LeafRow.tsx
import * as React from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { Row as ReactRow } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { EXPAND_COL_WIDTH, RIGHT_GAP } from './constants';
import { getStickyStyles, responsiveVisibility } from './utils/styles';
import type { ColumnMeta } from './utils/columnMeta';
import { useSortable } from '@dnd-kit/sortable';

type LeafRowProps<T extends object> = {
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
};

function toSxArray(sx: SxProps<Theme> | undefined) {
  if (!sx) return [] as any[];
  return Array.isArray(sx) ? (sx.filter(Boolean) as any[]) : [sx as any];
}

export default function LeafRow<T extends object>({
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
}: LeafRowProps<T>) {
  const theme = useTheme();

  // NOTE: we do NOT use transform on <tr> (tables can't be transformed reliably).
  const { attributes, listeners, setNodeRef } = useSortable({
    id: String(row.id),
    disabled: !enableRowDrag,
  });

  return (
    <>
      <TableRow
        ref={setNodeRef}
        {...(enableRowDrag ? attributes : {})} // ARIA/role only
        hover
        // no transform here: tables + transforms = bad time
      >
        {row.getVisibleCells().map((cell) => {
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
                  {...(enableRowDrag ? listeners : {})} // ONLY listeners on the handle
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </TableCell>
            );
          }

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

      {enableRowExpansion && isExpanded && (
        <TableRow>
          <TableCell
            colSpan={columnsLength + (enableRowExpansion ? 1 : 0)} // reorder col is part of columnsLength
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
