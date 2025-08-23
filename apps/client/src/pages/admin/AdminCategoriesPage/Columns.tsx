import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { NavigateFunction } from 'react-router-dom';
import { Avatar, Box, Typography } from '@mui/material';
import RowActions, { type RowAction } from '../../../components/RowActions';
import type { TCategory as Category } from '@common/types';
import i18n from 'i18next';

const t = (k: string, o?: any) => i18n.t(k, o);

export function defineCategoryColumns(
  navigate: NavigateFunction,
  onDelete?: (cat: Category) => void,
): ColumnDef<Category>[] {
  return [
    // 🖼 Image (thumbnail)
    {
      id: 'image',
      header: t('table.image', { defaultValue: 'Image' }),
      enableSorting: false,
      enableColumnFilter: false,
      size: 72,
      meta: { sticky: 'left', align: 'left' },
      cell: ({ row }) => {
        const { imageUrl, name } = row.original;
        const fallbackName =
          name ??
          t('adminCategories.fallbackName', { defaultValue: 'Category' });

        if (!imageUrl) {
          // fallback: avatar with initial
          return (
            <Avatar
              sx={{ width: 40, height: 40, fontWeight: 600 }}
              aria-label={t('adminCategories.imageAria', {
                name: fallbackName,
                defaultValue: '{{name}} image',
              })}
            >
              {fallbackName.charAt(0).toUpperCase()}
            </Avatar>
          );
        }

        return (
          <Box
            component="img"
            src={imageUrl}
            alt={fallbackName}
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
      header: t('table.name', { defaultValue: 'Name' }),
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
      header: t('table.actions', { defaultValue: 'Actions' }),
      enableSorting: false,
      enableColumnFilter: false,
      size: 170,
      meta: { sticky: 'right', align: 'left' },
      cell: ({ row }) => {
        const cat = row.original;
        const actions: ReadonlyArray<RowAction<Category>> = [
          {
            id: 'edit',
            label: t('actions.edit', { defaultValue: 'Edit' }),
            onClick: (c) => navigate(`/admin/categories/edit/${c.id}`),
            tooltip: (c) =>
              t('adminCategories.actions.tooltipEdit', {
                name: c.name ?? c.id,
                defaultValue: 'Edit {{name}}',
              }),
          },
          {
            id: 'delete',
            label: t('actions.delete', { defaultValue: 'Delete' }),
            danger: true,
            confirm: {
              title: t('adminCategories.confirm.title', {
                defaultValue: 'Delete category?',
              }),
              description: (c) =>
                t('adminCategories.confirm.description', {
                  name: c.name ?? c.id,
                  defaultValue: 'This will permanently delete {{name}}.',
                }),
              confirmText: t('actions.delete', { defaultValue: 'Delete' }),
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
