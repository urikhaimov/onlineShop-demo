// src/pages/Columns.ts
import { ColumnDef, CellContext } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import {
  betweenDateRange,
  betweenNumberRange,
} from '../../components/StickyTable/tableFilters';
import { RankChip } from '../../components/RankChip';
import { StatusTag, STATUS_OPTIONS } from '../../components/StatusTag';

function getRank<T>(ctx: CellContext<T, unknown>): number {
  const { table, row } = ctx;
  const rows = table.getRowModel().rows;
  const idx = rows.findIndex((r) => r.id === row.id);
  return idx >= 0 ? idx + 1 : rows.length; // 1-based, fallback to end
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any) &&
    'nanoseconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds: number };
    return new Date(v.seconds * 1000 + Math.floor(v.nanoseconds / 1_000_000));
  }
  return null;
}

export const defineOrderColumns = (): ColumnDef<TOrder>[] => [
  {
    accessorKey: 'id',
    header: 'Order ID',
    enableColumnFilter: false,
    meta: { sticky: 'left' }, // visible on mobile
    cell: (info) => (
      <Typography
        variant="body2"
        sx={{ maxWidth: 160, wordBreak: 'break-all' }}
      >
        {info.getValue<string>()}
      </Typography>
    ),
  },
  {
    id: 'createdAt',
    accessorFn: (row) => row.metadata?.createdAt ?? null,
    header: 'Date',
    filterFn: betweenDateRange,
    meta: { filterVariant: 'date', hiddenOnMobile: true },
    cell: (info) => {
      const raw = info.getValue<unknown>();
      const date = toDate(raw) ?? new Date(0);
      return (
        <Typography variant="body2" color="text.secondary">
          {isNaN(date.getTime()) ? '—' : format(date, 'PPpp')}
        </Typography>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Total ($)',
    filterFn: betweenNumberRange,
    meta: {
      filterVariant: 'number',
      align: 'left',
      hiddenOnMobile: true,
      numberRange: { min: 0, max: 100000, step: 1 },
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableColumnFilter: true,
    filterFn: 'equals',
    meta: {
      filterVariant: 'select',
      selectOptions: STATUS_OPTIONS, // <-- reuse from the tag
    },
    cell: ({ row }) => {
      const value = row.getValue<string>('status');
      return <StatusTag value={value} />;
    },
  },
];
