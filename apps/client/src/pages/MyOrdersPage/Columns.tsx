// src/pages/Columns.tsx
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { StatusTag } from '../../components/StatusTag';
import { useTranslation } from 'react-i18next';

import { asDate, DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';

// ---- Pure builder (NO HOOKS HERE) -----------------------------------------
type Formatters = {
  formatCurrency: (n: number) => string;
  formatDateTime: (d: Date) => string;
};

export function buildOrderColumns(
  t: (key: string, opts?: any) => string,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<TOrder>[] {
  return [
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
        return formatCurrency(v);
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
}

// ---- Hook wrapper (call this in your page, always at top-level) ------------
export function useOrderColumns(): ColumnDef<TOrder>[] {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  return React.useMemo(
    () => buildOrderColumns(t, { formatCurrency, formatDateTime }),
    [t, formatCurrency, formatDateTime],
  );
}

// (Optional) If some legacy site needs a pure factory, export one that
// requires the caller to pass t + formatters (no hooks here).
export function defineOrderColumnsPure(
  tFn: (key: string, opts?: any) => string,
  formatCurrency: (n: number) => string,
  formatDateTime: (d: Date) => string,
): ColumnDef<TOrder>[] {
  return buildOrderColumns(tFn, { formatCurrency, formatDateTime });
}
