import { ColumnDef } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { Checkbox, IconButton, Tooltip, CardMedia, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { NavigateFunction } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';

export function defineProductColumns(
  navigate: NavigateFunction,
  onDelete?: (id: string) => void,
): ColumnDef<IProduct>[] {
  return [
    {
      accessorKey: 'images',
      header: 'Image',
      cell: (info) => {
        console.log('Image cell info:', info);
        const images = info.getValue() as string[] | undefined;
        const firstImage =
          images?.[0] || 'https://picsum.photos/seed/fallback/100/100';

        return (
          <CardMedia
            component="img"
            sx={{
              width: 80,
              height: 80,
              borderRadius: 1,
              objectFit: 'cover',
              mx: { xs: 'auto', sm: 0 },
            }}
            image={firstImage}
            alt="Product Image"
          />
        );
      },
      enableColumnFilter: false,
    },

    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: true,
      meta: { filterVariant: 'text' },
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      filterFn: 'equals',
      meta: { filterVariant: 'number' },
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: { filterVariant: 'number' },
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: (info) => info.getValue() ?? '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: { filterVariant: 'date' },
      cell: ({ getValue }) => {
        const raw = getValue<string | Date>();
        const date = new Date(raw);
        return isNaN(date.getTime())
          ? 'N/A'
          : date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit Product">
            <IconButton
              onClick={() =>
                navigate(`/admin/products/edit/${row.original.id}`)
              }
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Product">
            <IconButton
              onClick={() => onDelete?.(row.original.id)}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];
}
