// src/pages/admin/categories/defineCategoryColumns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import { Avatar, Box, Typography } from '@mui/material';
import RowActions, { type RowAction } from '../../../components/RowActions';
import type { TCategory as Category } from '@common/types';
import i18n from 'i18next';

// Icons
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Coerce unknown/i18n output into a string
const s = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''));

const t = (k: string, o?: any) => i18n.t(k, o);

export function defineCategoryColumns(
  navigate: NavigateFunction,
  onDelete?: (cat: Category) => void,
): ColumnDef<Category>[] {
  return [
    // 🖼 Image (thumbnail)
    {
      id: 'image',
      header: s(t('table.image', { defaultValue: 'Image' })),
      enableSorting: false,
      enableColumnFilter: false,
      size: 72,
      meta: { sticky: 'left', align: 'left' },
      cell: ({ row }) => {
        const { imageUrl, name } = row.original;
        const fallbackName =
          (name && typeof name === 'string' ? name : '') ||
          s(t('adminCategories.fallbackName', { defaultValue: 'Category' }));

        if (!imageUrl) {
          const initial = fallbackName.trim().charAt(0).toUpperCase();
          return (
            <Avatar
              sx={{ width: 40, height: 40, fontWeight: 600 }}
              aria-label={s(
                t('adminCategories.imageAria', {
                  name: fallbackName,
                  defaultValue: '{{name}} image',
                }),
              )}
            >
              {initial || '•'}
            </Avatar>
          );
        }

        return (
          <Box
            component="img"
            src={String(imageUrl)}
            alt={fallbackName} // now guaranteed string
            loading="lazy"
            decoding="async"
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
      header: s(t('table.name', { defaultValue: 'Name' })),
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

    // ⚙️ Actions
    {
      id: 'actions',
      header: s(t('table.actions', { defaultValue: 'Actions' })),
      enableSorting: false,
      enableColumnFilter: false,
      size: 170,
      meta: { sticky: 'right', align: 'left' },
      cell: ({ row }) => {
        const cat = row.original;

        const actions: ReadonlyArray<RowAction<Category>> = [
          {
            id: 'edit',
            label: s(t('actions.edit', { defaultValue: 'Edit' })),
            icon: <EditOutlinedIcon fontSize="small" />,
            onClick: (c) => navigate(`/admin/categories/edit/${c.id}`),
            tooltip: (c) =>
              s(
                t('adminCategories.actions.tooltipEdit', {
                  name: c.name ?? c.id,
                  defaultValue: 'Edit {{name}}',
                }),
              ),
          },
          {
            id: 'delete',
            label: s(t('actions.delete', { defaultValue: 'Delete' })),
            icon: <DeleteOutlineIcon fontSize="small" />,
            // Uncomment if you want a confirm dialog (ensure RowAction type matches)
            // confirm: {
            //   title: s(t('adminCategories.confirm.title', { defaultValue: 'Delete category?' })),
            //   description: (c) =>
            //     s(
            //       t('adminCategories.confirm.description', {
            //         name: c.name ?? c.id,
            //         defaultValue: 'This will permanently delete {{name}}.',
            //       }),
            //     ),
            //   confirmText: s(t('actions.delete', { defaultValue: 'Delete' })),
            // },
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
