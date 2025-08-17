// src/pages/admin/Columns.tsx
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import type { Order } from '../../../hooks/useOrders';
import { StatusTag, STATUS_OPTIONS } from '../../../components/StatusTag';

/** Robust date coercion (supports Date, string/number, Firestore Timestamp-like) */
function toDate(v: unknown): Date | undefined {
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
      return undefined;
    }
  }
  return undefined;
}

export function defineAdminOrderColumns(
  navigate: NavigateFunction,
  onDelete?: (order: Order) => Promise<void> | void, // optional delete callback
): ColumnDef<Order>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Order ID',
      enableSorting: true,
      enableColumnFilter: true,
      size: 180,
      meta: {
        sticky: 'left',
        hiddenOnMobile: false,
        align: 'left',
        filterVariant: 'text',
      },
      cell: (info) => info.getValue<string>() ?? '—',
    },
    {
      accessorKey: 'userId',
      header: 'User ID',
      enableSorting: true,
      enableColumnFilter: true,
      size: 200,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'text' },
      cell: (info) => info.getValue<string>() ?? '—',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      enableColumnFilter: true,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'text' },
      cell: (info) => info.getValue<string>() ?? 'N/A',
    },
    {
      accessorKey: 'total',
      header: 'Total',
      enableSorting: true,
      enableColumnFilter: true,
      size: 120,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'number' },
      cell: (info) => {
        const v = info.getValue<number | undefined>();
        return typeof v === 'number' ? `$${v.toFixed(2)}` : 'N/A';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      enableSorting: true,
      enableColumnFilter: true,
      size: 180,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'date' },
      cell: ({ row }) => {
        const d = toDate(row.original.createdAt);
        return d ? d.toLocaleString() : '—';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      enableColumnFilter: true,
      size: 160,
      meta: {
        hiddenOnMobile: true,
        align: 'left',
        filterVariant: 'select',
        selectOptions: STATUS_OPTIONS,
      },
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
        const actions: ReadonlyArray<RowAction<Order>> = [
          {
            id: 'view',
            label: 'View',
            onClick: (o) => navigate(`/admin/orders/${o.id}`),
            tooltip: (o) => `View order ${o.id}`,
          },
          {
            id: 'edit',
            label: 'Edit',
            onClick: (o) => navigate(`/admin/orders/${o.id}?edit=1`),
            tooltip: (o) => `Edit order ${o.id}`,
          },
          {
            id: 'delete',
            label: 'Delete',
            danger: true,
            confirm: {
              title: 'Delete order?',
              description: (o) => `This will permanently delete order ${o.id}.`,
              confirmText: 'Delete',
            },
            onClick: async (o) => {
              if (onDelete) {
                await onDelete(o);
              } else {
                console.warn(
                  'Delete action triggered but no onDelete handler provided',
                  o,
                );
              }
            },
          },
        ];
        return (
          <RowActions<Order>
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
