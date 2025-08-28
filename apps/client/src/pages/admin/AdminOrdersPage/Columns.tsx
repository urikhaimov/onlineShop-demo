// src/pages/AdminOrdersPage/Columns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import { ECurrency, TOrder } from '@common/types';
import { StatusTag } from '../../../components/StatusTag';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import i18n from '../../../i18n/i18n';

import {
  DASH,
  asDate,
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../../../utils/columns.util';

// Reusable factories
import { makeCurrencyColumn } from '../../../utils/columnPresets';

export function defineAdminOrderColumns(
  navigate: NavigateFunction,
  onDelete?: (order: TOrder) => Promise<void> | void,
): ColumnDef<TOrder>[] {
  // Compute once per invocation and reuse
  const lng = getLocale(i18n.resolvedLanguage || i18n.language);
  const currencyFmt = makeCurrencyFormatter(lng, ECurrency.USD); // change currency if needed
  const dateTimeFmt = makeDateTimeFormatter(lng);

  // Amount column via reusable factory
  const amountCol: ColumnDef<TOrder> = makeCurrencyColumn<TOrder>(
    'amount',
    i18n.t('table.total'),
    currencyFmt,
    {
      enableFilter: false,
      size: 120,
      align: 'right',
      hiddenOnMobile: true,
    },
  );

  // Created At — order-specific (typed for TOrder, supports metadata fallback)
  const createdAtCol: ColumnDef<TOrder> = {
    accessorKey: 'createdAt',
    header: i18n.t('table.date'),
    enableSorting: true,
    enableColumnFilter: false,
    size: 180,
    meta: { hiddenOnMobile: true, align: 'left' },
    cell: ({ row }) => {
      const d =
        asDate(row.original.createdAt) ??
        asDate((row.original as any)?.metadata?.createdAt);
      return d ? dateTimeFmt(d) : DASH;
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
