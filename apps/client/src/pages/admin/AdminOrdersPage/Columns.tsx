// src/pages/admin/Columns.tsx
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';

import RowActions, { type RowAction } from '../../../components/RowActions';
import type { Order } from '../../../hooks/useOrders';

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
): ColumnDef<Order>[] {
  return [
    // Visible on mobile; sticky left
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

    // Hidden on mobile
    {
      accessorKey: 'userId',
      header: 'User ID',
      enableSorting: true,
      enableColumnFilter: true,
      size: 200,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'text' },
      cell: (info) => info.getValue<string>() ?? '—',
    },

    // Hidden on mobile
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
      enableColumnFilter: true,
      size: 220,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'text' },
      cell: (info) => info.getValue<string>() ?? 'N/A',
    },

    // Hidden on mobile
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

    // Hidden on mobile
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

    // Hidden on mobile (uses select filter)
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      enableColumnFilter: true,
      size: 140,
      meta: {
        hiddenOnMobile: true,
        align: 'left',
        filterVariant: 'select',
        selectOptions: [
          { label: 'Pending', value: 'pending' },
          { label: 'Confirmed', value: 'confirmed' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
      cell: (info) => String(info.getValue() ?? '—'),
    },

    // Visible on mobile; sticky right; RowActions
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      size: 160,
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
          // Example delete (enable later if needed):
          // {
          //   id: 'delete',
          //   label: 'Delete',
          //   danger: true,
          //   confirm: {
          //     title: 'Delete order?',
          //     description: (o) => `This will permanently delete order ${o.id}.`,
          //     confirmText: 'Delete',
          //   },
          //   onClick: async (o) => { /* call API */ },
          // },
        ];
        return (
          <RowActions<Order>
            context={order}
            actions={actions}
            renderMode="auto" // buttons on desktop; menu on mobile
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}
