import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';

import { StatusTag } from '../../../components/StatusTag';
import RowActions, { type RowAction } from '../../../components/RowActions';

import i18n from '../../../i18n/i18n';
import {
  DASH,
  asDate,
  getLocale,
  makeDateTimeFormatter,
} from '../../../utils/columns.util';
import { makeCurrencyColumn } from '../../../utils/columnPresets';

import type { TOrder } from '@common/types';
import { CDefaultCurrency } from '@common/types';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { asDateLoose } from '../../../utils/date.util';
export function defineAdminOrderColumns(
  navigate: NavigateFunction,
  onDelete?: (order: TOrder) => Promise<void> | void,
): ColumnDef<TOrder>[] {
  // locale + formatters
  const locale = getLocale(i18n.resolvedLanguage || i18n.language);
  const formatDateTime = makeDateTimeFormatter(locale);

  // Build a currency formatter function (expects MINOR units: cents/agorot)
  const formatCurrencyMinor = (minor: number): string =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CDefaultCurrency, // e.g. "ILS"
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format((minor ?? 0) / 100);

  // Total Amount column
  const amountCol: ColumnDef<TOrder> = makeCurrencyColumn<TOrder>(
    'total',
    i18n.t('table.total'),
    formatCurrencyMinor, // 👈 pass a FUNCTION, not a string
    {
      enableFilter: false,
      size: 120,
      align: 'right',
      hiddenOnMobile: true,
    },
  );

  // Created At column (supports metadata fallback)
  const createdAtCol: ColumnDef<TOrder> = {
    accessorKey: 'createdAt',
    header: i18n.t('table.date'),
    enableSorting: true,
    enableColumnFilter: false,
    size: 180,
    meta: { hiddenOnMobile: true, align: 'left' },
    cell: ({ row }) => {
      const d =
        asDateLoose((row.original as any).createdAt) ??
        asDateLoose(row.original.metadata?.createdAt as any);
      return d ? formatDateTime(d) : DASH;
    },
  };

  return [
    {
      accessorKey: 'id',
      header: i18n.t('table.orderId'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { sticky: 'left', hiddenOnMobile: false, align: 'left' },
      cell: (info) => info.getValue<string>() ?? DASH,
    },
    {
      accessorKey: 'email',
      header: i18n.t('adminUsers.columns.email'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => info.getValue<string>() ?? DASH,
    },

    amountCol,
    createdAtCol,

    {
      accessorKey: 'status',
      header: i18n.t('table.status'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 160,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => <StatusTag value={info.getValue<string>()} />,
    },
    {
      id: 'actions',
      header: i18n.t('table.actions'),
      enableSorting: false,
      enableColumnFilter: false,
      size: 180,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'left' },
      cell: ({ row }) => {
        const order = row.original;
        const actions: RowAction<TOrder>[] = [
          {
            id: 'edit',
            label: i18n.t('adminOrders.actions.edit'),
            icon: <EditIcon fontSize="small" />,
            onClick: (o) => navigate(`/admin/orders/${o.id}?edit=1`),
            tooltip: (o) =>
              i18n.t('adminOrders.actions.tooltipEdit', { id: o.id }),
          },
          {
            id: 'delete',
            label: i18n.t('adminOrders.actions.delete'),
            icon: <DeleteIcon fontSize="small" />,
            onClick: async (o) => onDelete?.(o),
            tooltip: (o) =>
              i18n.t('adminOrders.actions.tooltipDelete', { id: o.id }),
          },
        ];
        return (
          <RowActions<TOrder>
            context={order}
            actions={actions}
            renderMode="auto"
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}
