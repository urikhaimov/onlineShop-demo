import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CardMedia } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { IProduct } from '@common/types';
import ActionRow, { type RowAction } from '../../../components/RowActions';
import {
  betweenNumberRange,
  betweenDateRange,
} from '../../../components/StickyTable/tableFilters';

const IMG_SIZE = 80;

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds?: number };
    const d = new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function defineProductColumns(
  categories: { id: string; name: string }[],
  navigate: ReturnType<typeof useNavigate>,
): ColumnDef<IProduct>[] {
  return [
    // Image — visible on mobile, sticky left
    {
      accessorKey: 'images',
      header: 'Image',
      enableColumnFilter: false,
      size: 100,
      meta: { sticky: 'left', hiddenOnMobile: false, align: 'left' },
      cell: ({ row, getValue }) => {
        const images = getValue<string[] | undefined>() ?? [];
        const firstImage =
          images[0] || 'https://picsum.photos/seed/fallback/100/100';
        const id = row.original.id;
        return (
          <Link to={`/product/${id}`}>
            <CardMedia
              component="img"
              sx={{
                width: IMG_SIZE,
                height: IMG_SIZE,
                borderRadius: 1,
                objectFit: 'cover',
                mx: { xs: 'auto', sm: 0 },
                cursor: 'pointer',
              }}
              image={firstImage}
              alt="Product"
            />
          </Link>
        );
      },
    },

    // Name — hidden on mobile
    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: true,
      enableSorting: true,
      size: 240,
      meta: { filterVariant: 'text', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },

    // Category — hidden on mobile, select filter
    {
      accessorKey: 'categoryId',
      header: 'Category',
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      filterFn: 'equals',
      meta: {
        filterVariant: 'select',
        hiddenOnMobile: true,
        align: 'left',
        selectOptions: categories.map((c) => ({ label: c.name, value: c.id })),
      },
      cell: ({ getValue }) => {
        const catId = getValue<string>();
        const cat = categories.find((c) => c.id === catId);
        return cat?.name ?? 'Unknown';
      },
    },

    // Stock — hidden on mobile, number range filter
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

    // Price — hidden on mobile, number range filter
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

    // Created At — hidden on mobile, date range filter
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

    // Actions — visible on mobile, sticky right; ActionRow (RowActions)
    {
      id: 'actions',
      header: 'Actions',
      enableColumnFilter: false,
      enableSorting: false,
      size: 140,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'right' },
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
            danger: true,
            confirm: {
              title: 'Delete product',
              description: (p) =>
                `Are you sure you want to delete "${p.name}"?`,
              confirmText: 'Delete',
              cancelText: 'Cancel',
              color: 'error',
            },
            onClick: (p) => navigate(`/admin/products/delete/${p.id}`),
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
