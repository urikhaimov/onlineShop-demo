import { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import type { TCategory as Category } from '@common/types';
import RowActions, { type RowAction } from '../../../components/RowActions';

const IMG_SIZE = 40;

export function defineCategoryColumns(
  navigate: ReturnType<typeof useNavigate>,
): ColumnDef<Category>[] {
  return [
    // Name (visible on mobile, sticky left)
    {
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
      enableColumnFilter: true,
      size: 220,
      meta: {
        sticky: 'left',
        align: 'left',
        filterVariant: 'text',
        hiddenOnMobile: false,
      },
    },

    // Image (hidden on mobile)
    {
      header: 'Image',
      accessorKey: 'imageUrl',
      enableSorting: false,
      enableColumnFilter: false,
      size: 90,
      meta: { hiddenOnMobile: true },
      cell: ({ getValue }) => {
        const url = getValue<string | null | undefined>();
        return url ? (
          <img
            src={url}
            alt="category"
            style={{ width: IMG_SIZE, height: IMG_SIZE, objectFit: 'contain' }}
          />
        ) : (
          'No image'
        );
      },
    },

    // Order (hidden on mobile)
    {
      header: 'Order',
      accessorKey: 'order',
      enableSorting: true,
      enableColumnFilter: false,
      size: 90,
      meta: { hiddenOnMobile: true, align: 'left', filterVariant: 'number' },
      cell: ({ getValue }) => getValue<number | null | undefined>() ?? '—',
    },

    // Description (hidden on mobile)
    {
      header: 'Description',
      accessorKey: 'description',
      enableSorting: true,
      enableColumnFilter: false,
      size: 280,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const value = getValue<unknown>();
        return value === null
          ? 'null'
          : value === undefined
            ? 'undefined'
            : String(value);
      },
    },

    // Actions (visible on mobile, sticky right, uses RowActions)
    {
      header: 'Actions',
      id: 'actions',
      enableSorting: false,
      enableColumnFilter: false,
      size: 120,
      meta: { sticky: 'left', align: 'left', hiddenOnMobile: false },
      cell: ({ row }) => {
        const ctx = row.original;
        const actions: ReadonlyArray<RowAction<Category>> = [
          {
            id: 'edit',
            label: 'Edit',
            icon: <EditIcon fontSize="small" />,
            onClick: (c) => navigate(`/admin/categories/edit/${c.id}`),
            tooltip: (c) => `Edit "${c.name}"`,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <DeleteIcon fontSize="small" />,
            danger: true,
            confirm: {
              title: 'Delete category',
              description: (c) =>
                `Are you sure you want to delete "${c.name}"?`,
              confirmText: 'Delete',
              cancelText: 'Cancel',
              color: 'error',
            },
            onClick: (c) => navigate(`/admin/categories/delete/${c.id}`),
            tooltip: (c) => `Delete "${c.name}"`,
          },
        ];

        return (
          <RowActions<Category>
            context={ctx}
            actions={actions}
            renderMode="auto" // buttons on desktop, menu on mobile
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}
