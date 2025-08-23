import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import { TOrder } from '@common/types';
import { StatusTag } from '../../../components/StatusTag';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { t } from 'i18next';
import i18n from '../../../i18n/i18n';

function asDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === 'object' && v !== null && 'toDate' in (v as any)) {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export function defineAdminOrderColumns(
  navigate: NavigateFunction,
  onDelete?: (order: TOrder) => Promise<void> | void,
): ColumnDef<TOrder>[] {
  return [
    {
      accessorKey: 'id',
      header: t('table.orderId'),
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { sticky: 'left', hiddenOnMobile: false, align: 'left' },
      cell: (info) => info.getValue<string>() ?? '—',
    },
    {
      accessorKey: 'email',
      header: t('adminUsers.columns.email'), // reuse existing key
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => info.getValue<string>() ?? '—',
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
        if (typeof v !== 'number') return '—';
        const lng = (i18n.language || 'en').split('-')[0];
        return new Intl.NumberFormat(lng, {
          style: 'currency',
          currency: 'USD', // adjust if your store uses a different currency
          maximumFractionDigits: 2,
        }).format(v);
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
        if (!d) return '—';
        const lng = (i18n.language || 'en').split('-')[0];
        return new Intl.DateTimeFormat(lng, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(d);
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
        const actions: readonly RowAction<TOrder>[] = [
          {
            id: 'view',
            label: t('adminOrders.actions.view'),
            icon: <VisibilityIcon fontSize="small" />,
            onClick: (o) => navigate(`/admin/orders/${o.id}`),
            tooltip: (o) => t('adminOrders.actions.tooltipView', { id: o.id }),
          },
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
            renderMode="auto" // buttons on desktop, menu on small screens
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}
