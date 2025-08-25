// src/pages/Columns.ts
import { ColumnDef, CellContext } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { Timestamp } from 'firebase/firestore';
import { StatusTag } from '../../components/StatusTag';
import { t } from 'i18next';
import i18n from '../../i18n/i18n';

function getRank<T>(ctx: CellContext<T, unknown>): number {
  const { table, row } = ctx;
  const rows = table.getRowModel().rows;
  const idx = rows.findIndex((r) => r.id === row.id);
  return idx >= 0 ? idx + 1 : rows.length;
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
    header: t('table.orderId'),
    enableColumnFilter: false,
    meta: { sticky: 'left' },
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
    header: t('table.date'),
    enableColumnFilter: false,
    meta: { hiddenOnMobile: true, align: 'left' },
    cell: (info) => {
      const raw = info.getValue<unknown>();
      const date = toDate(raw) ?? new Date(NaN);
      if (isNaN(date.getTime()))
        return <Typography variant="body2">—</Typography>;

      const lng = (i18n.language || 'en').split('-')[0];
      const formatted = new Intl.DateTimeFormat(lng, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);

      return (
        <Typography variant="body2" color="text.secondary">
          {formatted}
        </Typography>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: t('table.total'),
    enableColumnFilter: false,
    meta: { hiddenOnMobile: true, align: 'right' },
    cell: ({ getValue }) => {
      const v = getValue<number>();
      if (typeof v !== 'number') return '—';
      const lng = (i18n.language || 'en').split('-')[0];
      return new Intl.NumberFormat(lng, {
        style: 'currency',
        currency: 'USD', // change if your store uses a different currency
        maximumFractionDigits: 2,
      }).format(v);
    },
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    enableColumnFilter: false,
    meta: { align: 'left' },
    cell: ({ row }) => {
      const value = row.getValue<string>('status');
      return <StatusTag value={value} />;
    },
  },
];
