// src/pages/admin/Columns.tsx (Categories)
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import RowActions, { type RowAction } from '../../../components/RowActions';
import type { TCategory as Category } from '@common/types';

export function defineCategoryColumns(
  navigate: NavigateFunction,
  onDelete?: (cat: Category) => void, // ✅ add optional second param
): ColumnDef<Category>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { align: 'left', filterVariant: 'text' },
      size: 240,
      cell: (info) => info.getValue<string>() ?? '—',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      enableColumnFilter: true,
      meta: { align: 'left', filterVariant: 'text', hiddenOnMobile: true },
      size: 360,
      cell: (info) => info.getValue<string>() ?? '—',
    },

    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      size: 170,
      meta: { sticky: 'right', align: 'left' },
      cell: ({ row }) => {
        const cat = row.original;
        const actions: ReadonlyArray<RowAction<Category>> = [
          {
            id: 'view',
            label: 'View',
            onClick: (c) => navigate(`/admin/categories/${c.id}`),
            tooltip: (c) => `View ${c.name ?? c.id}`,
          },
          {
            id: 'edit',
            label: 'Edit',
            onClick: (c) => navigate(`/admin/categories/edit/${c.id}`),
            tooltip: (c) => `Edit ${c.name ?? c.id}`,
          },
          {
            id: 'delete',
            label: 'Delete',
            danger: true,
            confirm: {
              title: 'Delete category?',
              description: (c) =>
                `This will permanently delete ${c.name ?? c.id}.`,
              confirmText: 'Delete',
            },
            onClick: (c) => {
              if (onDelete)
                onDelete(c); // ✅ call the callback
              else console.warn('No delete handler provided for category', c);
            },
          },
        ];
        return (
          <RowActions<Category>
            context={cat}
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
