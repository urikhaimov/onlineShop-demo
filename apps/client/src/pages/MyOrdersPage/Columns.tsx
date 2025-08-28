// src/pages/Columns.tsx
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { StatusTag } from '../../components/StatusTag';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { asDate, DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { makeCurrencyColumn } from '../../utils/columnPresets';

// ---- Pure builder (NO HOOKS HERE) -----------------------------------------
type Formatters = {
  formatCurrency: (n: number) => string;
  formatDateTime: (d: Date) => string;
};

export function buildOrderColumns(
  t: TFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<TOrder>[] {
  // Reused currency column for "amount"
  const amountCol: ColumnDef<TOrder> = makeCurrencyColumn<TOrder>(
    'amount',
    t('table.total'),
    formatCurrency,
    {
      enableFilter: false,
      align: 'right',
      hiddenOnMobile: true,
    },
  );

  // CreatedAt with metadata fallback
  const createdAtCol: ColumnDef<TOrder> = {
    id: 'createdAt',
    accessorFn: (row) => row.metadata?.createdAt ?? row.createdAt ?? null,
    header: t('table.date'),
    enableColumnFilter: false,
    meta: { hiddenOnMobile: true, align: 'left' },
    cell: (info) => {
      const d = asDate(info.getValue<Date | string | number | null>());
      return (
        <Typography variant="body2" color="text.secondary">
          {d ? formatDateTime(d) : DASH}
        </Typography>
      );
    },
  };

  return [
    {
      accessorKey: 'id',
      header: t('table.orderId'),
      enableColumnFilter: false,
      meta: { sticky: 'left' as const },
      cell: (info) => (
        <Typography
          variant="body2"
          sx={{ maxWidth: 160, wordBreak: 'break-all' }}
        >
          {info.getValue<string>() ?? DASH}
        </Typography>
      ),
    },

    createdAtCol,
    amountCol,

    {
      accessorKey: 'status',
      header: t('table.status'),
      enableColumnFilter: false,
      meta: { align: 'left' as const },
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

// Optional pure factory variant
export function defineOrderColumnsPure(
  tFn: TFunction,
  formatCurrency: (n: number) => string,
  formatDateTime: (d: Date) => string,
): ColumnDef<TOrder>[] {
  return buildOrderColumns(tFn, { formatCurrency, formatDateTime });
}
