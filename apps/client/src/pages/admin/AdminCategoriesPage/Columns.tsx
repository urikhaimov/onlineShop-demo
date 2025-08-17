// src/pages/admin/Columns.tsx (Categories)
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import { Avatar, Box, Typography } from '@mui/material';
import RowActions, { type RowAction } from '../../../components/RowActions';
import type { TCategory as Category } from '@common/types';

export function defineCategoryColumns(
  navigate: NavigateFunction,
  onDelete?: (cat: Category) => void,
): ColumnDef<Category>[] {
  return [
    // 🖼 Image (thumbnail)
    {
      id: 'image',
      header: 'Image',
      enableSorting: false,
      enableColumnFilter: false,
      size: 72,
      meta: { sticky: 'left', align: 'left' },
      cell: ({ row }) => {
        const { imageUrl, name } = row.original;
        if (!imageUrl) {
          // fallback: avatar with initial
          return (
            <Avatar
              sx={{ width: 40, height: 40, fontWeight: 600 }}
              aria-label={`${name ?? 'Category'} image`}
            >
              {(name ?? '?').charAt(0).toUpperCase()}
            </Avatar>
          );
        }
        return (
          <Box
            component="img"
            src={imageUrl}
            alt={name ?? 'Category'}
            sx={{
              width: 48,
              height: 48,
              objectFit: 'cover',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        );
      },
    },

    // 📛 Name
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { align: 'left', filterVariant: 'text', sticky: 'left' },
      size: 240,
      cell: (info) => (
        <Typography variant="body2">
          {info.getValue<string>() ?? '—'}
        </Typography>
      ),
    },

    // ❌ Description column removed (now shown in expanded row)

    // ⚙️ Actions
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
              if (onDelete) onDelete(c);
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
