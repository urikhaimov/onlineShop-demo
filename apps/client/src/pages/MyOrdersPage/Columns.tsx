// src/pages/Columns.tsx
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { TOrder } from '@common/types';
import { Typography } from '@mui/material';
import { StatusTag } from '../../components/StatusTag';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { DASH } from '../../utils/columns.util';
import { asDateLoose } from '../../utils/date.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { makeCurrencyColumn } from '../../utils/columnPresets';

// ---- Pure builder (NO HOOKS HERE) -----------------------------------------
type Formatters = {
  formatCurrency: (n: number) => string; // expects MAJOR units
  formatDateTime: (d: Date) => string;
};

export function buildOrderColumns(
  t: TFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<TOrder>[] {
  // Convert MINOR → MAJOR before formatting
  const formatCurrencyFromMinor = (minor: number): string =>
    formatCurrency((minor ?? 0) / 100);

  // Total Amount (stored as MINOR units)
  const amountCol: ColumnDef<TOrder> = makeCurrencyColumn<TOrder>(
    'totalAmount',
    t('table.total'),
    formatCurrencyFromMinor,
    {
      enableFilter: false,
      align: 'right',
      hiddenOnMobile: true,
    },
  );

  // CreatedAt with metadata fallback + robust parsing
  const createdAtCol: ColumnDef<TOrder> = {
    accessorKey: 'createdAt',
    header: t('table.date'),
    enableColumnFilter: false,
    enableSorting: true,
    meta: { hiddenOnMobile: true, align: 'left' },
    size: 180,
    cell: ({ row }) => {
      const created =
        asDateLoose(
          (row.original as unknown as { createdAt?: unknown }).createdAt,
        ) ?? asDateLoose(row.original.metadata?.createdAt as unknown);
      return (
        <Typography variant="body2" color="text.secondary">
          {created ? formatDateTime(created) : DASH}
        </Typography>
      );
    },
  };

  return [
    {
      accessorKey: 'id',
      header: t('table.orderId'),
      enableColumnFilter: false,
      enableSorting: true,
      meta: { sticky: 'left' as const, align: 'left' as const },
      size: 220,
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
      enableSorting: true,
      meta: { align: 'left' as const },
      size: 160,
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
