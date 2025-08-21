// src/pages/admin/AdminProductsPage/Columns.tsx
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { NavigateFunction } from 'react-router-dom';

import type { IProduct } from '@common/types';
import ActionRow, { type RowAction } from '../../../components/RowActions';
import {
  betweenNumberRange,
  betweenDateRange,
} from '../../../components/StickyTable/tableFilters';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // Narrow unknown object shape (e.g., Firestore Timestamp-like)
  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;
    if (typeof rec.seconds === 'number') {
      const seconds = rec.seconds as number;
      const nanos =
        typeof rec.nanoseconds === 'number' ? (rec.nanoseconds as number) : 0;
      const d = new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }
  }

  return undefined;
}

export function defineProductColumns(
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
): ColumnDef<IProduct>[] {
  return [
    // Name — hidden on mobile
    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: true,
      enableSorting: true,
      size: 240,
      meta: { filterVariant: 'text', align: 'left' },
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },

    // Category — select filter, show human name
    {
      accessorKey: 'categoryId',
      header: 'Category',
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      filterFn: 'equals',
      meta: {
        filterVariant: 'select',
        align: 'left',
        selectOptions: categories.map((c) => ({ label: c.name, value: c.id })),
      },
      cell: ({ getValue }) => {
        const catId = getValue<string>();
        const cat = categories.find((c) => c.id === catId);
        return cat?.name ?? '—';
      },
    },

    // Stock — number range filter
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      filterFn: betweenNumberRange,
      meta: { filterVariant: 'number', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? v : '—';
      },
    },

    // Price — number range filter
    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      filterFn: betweenNumberRange,
      meta: { filterVariant: 'number', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? `$${v.toFixed(2)}` : '—';
      },
    },

    // Created At — date range filter
    {
      accessorKey: 'createdAt',
      header: 'Created',
      enableColumnFilter: true,
      enableSorting: true,
      size: 160,
      filterFn: betweenDateRange,
      meta: { filterVariant: 'date', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const date = toDate(getValue<unknown>());
        return date
          ? date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '—';
      },
    },

    // Actions — sticky right; uses RowActions component
    {
      id: 'actions',
      header: 'Actions',
      enableColumnFilter: false,
      enableSorting: false,
      size: 140,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'left' },
      cell: ({ row }) => {
        const ctx = row.original;
        const actions: ReadonlyArray<RowAction<IProduct>> = [
          {
            id: 'edit',
            label: 'Edit',
            icon: <EditIcon fontSize="small" />,
            onClick: (p) => navigate(`/admin/products/edit/${p.id}`),
            tooltip: (p) => `Edit "${p.name}"`,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <DeleteIcon fontSize="small" />,
            onClick: (p) => {
              const ok = window.confirm(
                `Are you sure you want to delete "${p.name}"?`,
              );
              if (ok) {
                // If your route shows a confirm page, this is enough:
                navigate(`/admin/products/delete/${p.id}`);
                // Or call your delete mutation here if you delete in-place.
              }
            },
            tooltip: (p) => `Delete "${p.name}"`,
          },
        ];

        return (
          <ActionRow<IProduct>
            context={ctx}
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
