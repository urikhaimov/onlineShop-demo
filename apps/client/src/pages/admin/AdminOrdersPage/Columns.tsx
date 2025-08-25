import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import { TOrder } from '@common/types';
import { StatusTag } from '../../../components/StatusTag';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { t } from 'i18next';
import i18n from '../../../i18n/i18n';

import {
  DASH,
  asDate,
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../../../utils/columns.util'; // adjust path if needed

export function defineAdminOrderColumns(
  navigate: NavigateFunction,
  onDelete?: (order: TOrder) => Promise<void> | void,
): ColumnDef<TOrder>[] {
  // Compute once per invocation and reuse
  const lng = getLocale(i18n.resolvedLanguage || i18n.language);
  const currencyFmt = makeCurrencyFormatter(lng, 'USD'); // change currency if needed
  const dateTimeFmt = makeDateTimeFormatter(lng);

  return [
    {
      accessorKey: 'id',
      header: t('table.orderId'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { sticky: 'left', hiddenOnMobile: false, align: 'left' },
      cell: (info) => info.getValue<string>() ?? DASH,
    },
    {
      accessorKey: 'email',
      header: t('adminUsers.columns.email'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => info.getValue<string>() ?? DASH,
    },
    {
      accessorKey: 'amount',
      header: t('table.total'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 120,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => {
        const v = info.getValue<number | undefined>();
        return typeof v === 'number' ? currencyFmt.format(v) : DASH;
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('table.date'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 180,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: ({ row }) => {
        const d =
          asDate(row.original.createdAt) ??
          asDate(row.original.metadata?.createdAt);
        return d ? dateTimeFmt(d) : DASH;
      },
    },
    {
      accessorKey: 'status',
      header: t('table.status'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 160,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => <StatusTag value={info.getValue<string>()} />,
    },
    {
      id: 'actions',
      header: t('table.actions'),
      enableSorting: false,
      enableColumnFilter: false,
      size: 180,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'left' },
      cell: ({ row }) => {
        const order = row.original;
        const actions: RowAction<TOrder>[] = [
          {
            id: 'edit',
            label: t('adminOrders.actions.edit'),
            icon: <EditIcon fontSize="small" />,
            onClick: (o) => navigate(`/admin/orders/${o.id}?edit=1`),
            tooltip: (o) => t('adminOrders.actions.tooltipEdit', { id: o.id }),
          },
          {
            id: 'delete',
            label: t('adminOrders.actions.delete'),
            icon: <DeleteIcon fontSize="small" />,
            onClick: async (o) => onDelete?.(o),
            tooltip: (o) =>
              t('adminOrders.actions.tooltipDelete', { id: o.id }),
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
