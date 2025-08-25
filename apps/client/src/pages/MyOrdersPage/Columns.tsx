// src/pages/Columns.ts
import { ColumnDef } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { StatusTag } from '../../components/StatusTag';
import { t } from 'i18next';
import i18n from '../../i18n/i18n';

import {
  DASH,
  asDate,
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../../utils/columns.util'; // ← adjust path if needed

// Precompute formatters once per module load (recreate if language changes on reload)
const lng = getLocale(i18n.resolvedLanguage || i18n.language);
const formatCurrency = makeCurrencyFormatter(lng, 'USD'); // change currency if needed
const formatDateTime = makeDateTimeFormatter(lng);

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
        {info.getValue<string>() ?? DASH}
      </Typography>
    ),
  },
  {
    id: 'createdAt',
    accessorFn: (row) => row.metadata?.createdAt ?? row.createdAt ?? null,
    header: t('table.date'),
    enableColumnFilter: false,
    meta: { hiddenOnMobile: true, align: 'left' },
    cell: (info) => {
      const d = asDate(info.getValue<unknown>() as any);
      return (
        <Typography variant="body2" color="text.secondary">
          {d ? formatDateTime(d) : DASH}
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
      return typeof v === 'number' ? formatCurrency(v) : DASH;
    },
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    enableColumnFilter: false,
    meta: { align: 'left' },
    cell: ({ row }) => <StatusTag value={row.getValue<string>('status')} />,
  },
];
