// src/components/StickyTable/TableHeadSection.tsx
import * as React from 'react';
import {
  TableHead,
  TableRow,
  TableCell,
  Typography,
  Stack,
  Box,
  useTheme,
} from '@mui/material';
import { flexRender, type Table as ReactTable } from '@tanstack/react-table';
import { EXPAND_COL_WIDTH, RIGHT_GAP } from './constants';
import { getStickyStyles, responsiveVisibility } from './utils/styles';
import type { ColumnMeta } from './utils/columnMeta';
import { renderColumnFilter } from './renderColumnFilter';
import type { SxProps, Theme } from '@mui/material/styles';

type Props<T extends object> = {
  table: ReactTable<T>;
  enableColumnFilters: boolean;
  enableRowExpansion: boolean;
  denseMode: boolean;
};

export default function TableHeadSection<T extends object>({
  table,
  enableColumnFilters,
  enableRowExpansion,
  denseMode,
}: Props<T>) {
  const theme = useTheme();

  return (
    <TableHead>
      {table.getHeaderGroups().map((group) => (
        <TableRow key={group.id}>
          {group.headers.map((header) => {
            const meta = header.column.columnDef.meta as ColumnMeta | undefined;

            // precompute helper outputs

            const stickySx: SxProps<Theme> = getStickyStyles(theme, meta);
            const hiddenSx: SxProps<Theme> = responsiveVisibility(meta);

            return (
              <TableCell
                key={header.id}
                sx={(th) => ({
                  // merge helper styles
                  ...stickySx,
                  ...hiddenSx,

                  top: 0,
                  zIndex: 10,
                  minWidth: {
                    xs: 60,
                    sm:
                      (header.column.columnDef.size as number | undefined) ??
                      100,
                  },
                  backgroundColor: th.palette.grey[50],
                  textAlign: 'left',
                  verticalAlign: 'top',
                  px: denseMode ? 0.5 : 1,
                  py: denseMode ? 0.25 : 0.5,
                })}
              >
                <Stack spacing={0.25} alignItems="flex-start">
                  <Typography variant="caption" fontWeight={600}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </Typography>

                  {enableColumnFilters && header.column.getCanFilter() && (
                    <Box sx={{ mt: 0.25 }}>
                      {renderColumnFilter(header.column, table)}
                    </Box>
                  )}
                </Stack>
              </TableCell>
            );
          })}

          {enableRowExpansion && (
            <TableCell
              sx={(th) => ({
                position: 'sticky',
                right: RIGHT_GAP,
                top: 0,
                zIndex: 10,
                backgroundColor: th.palette.grey[50],
                width: EXPAND_COL_WIDTH,
                minWidth: EXPAND_COL_WIDTH,
                maxWidth: EXPAND_COL_WIDTH,
                px: 0,
                py: denseMode ? 0.25 : 0.5,
              })}
            />
          )}
        </TableRow>
      ))}
    </TableHead>
  );
}
