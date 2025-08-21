import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import { TOrder } from '@common/types';
import { StatusTag } from '../../../components/StatusTag';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
      //todo
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
      header: 'Order ID',
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { sticky: 'left', hiddenOnMobile: false, align: 'left' },
      cell: (info) => info.getValue<string>() ?? '—',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      enableColumnFilter: false,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => info.getValue<string>() ?? 'N/A',
    },
    {
      accessorKey: 'amount',
      header: 'Total',
      enableSorting: true,
      enableColumnFilter: false,
      size: 120,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => {
        const v = info.getValue<number | undefined>();
        return typeof v === 'number' ? `$${v.toFixed(2)}` : 'N/A';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      enableSorting: true,
      enableColumnFilter: false,
      size: 180,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: ({ row }) => {
        const d =
          asDate(row.original.createdAt) ??
          asDate(row.original.metadata?.createdAt);
        return d ? d.toLocaleString() : '—';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      enableColumnFilter: false,
      size: 160,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: (info) => <StatusTag value={info.getValue<string>()} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      size: 180,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'left' },
      cell: ({ row }) => {
        const order = row.original;
        const actions: readonly RowAction<TOrder>[] = [
          {
            id: 'view',
            label: 'View',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: (o) => navigate(`/admin/orders/${o.id}`),
            tooltip: (o) => `View order ${o.id}`,
          },
          {
            id: 'edit',
            label: 'Edit',
            icon: <EditIcon fontSize="small" />,
            onClick: (o) => navigate(`/admin/orders/${o.id}?edit=1`),
            tooltip: (o) => `Edit order ${o.id}`,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <DeleteIcon fontSize="small" />,
            onClick: async (o) => onDelete?.(o),
            tooltip: () => 'Delete order',
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
