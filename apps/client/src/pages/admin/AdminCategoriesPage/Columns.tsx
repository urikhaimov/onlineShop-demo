import { ColumnDef } from '@tanstack/react-table';
import { IconButton, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { Category } from '../../../types/firebase';

export function defineCategoryColumns(
  navigate: ReturnType<typeof useNavigate>,
): ColumnDef<Category>[] {
  return [
    {
      header: 'Image',
      accessorKey: 'imageUrl',
      cell: ({ getValue }) => {
        const url = getValue() as string;
        return url ? (
          <img
            src={url}
            alt="category"
            style={{ width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          'No image'
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      header: 'Order',
      accessorKey: 'order',
      cell: ({ getValue }) => getValue() ?? '—',
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterType: 'text',
      },
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ getValue }) => {
        const value = getValue();
        return value === null
          ? 'null'
          : value === undefined
            ? 'undefined'
            : value;
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <>
          <IconButton
            onClick={() =>
              navigate(`/admin/categories/edit/${row.original.id}`)
            }
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            color="error"
            onClick={() =>
              navigate(`/admin/categories/delete/${row.original.id}`)
            }
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];
}
