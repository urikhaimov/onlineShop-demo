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
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
    },
    {
      accessorKey: 'inStock',
      header: 'In Stock',
      cell: (info) => (
        <Checkbox
          checked={!!info.getValue()}
          disabled
          inputProps={{ 'aria-label': 'In stock checkbox' }}
        />
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: (info) => info.getValue() ?? '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: (info) => {
        const raw = info.getValue();
        let date: Date;

        if (typeof raw === 'string') {
          date = new Date(raw);
        } else if (raw instanceof Date) {
          date = raw;
        } else if ((raw as Timestamp)?.toDate instanceof Function) {
          date = (raw as Timestamp).toDate();
        } else {
          date = new Date(); // fallback
        }

        return date.toLocaleDateString();
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
