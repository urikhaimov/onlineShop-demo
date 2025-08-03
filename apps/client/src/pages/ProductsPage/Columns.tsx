import { ColumnDef } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { CardMedia, Button, Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct, any>[] {
  return [
    {
      accessorKey: 'images',
      header: 'Image',
      enableColumnFilter: false,
      cell: ({ row, getValue }) => {
        const images = getValue<string[]>() ?? [];
        const firstImage =
          images[0] || 'https://picsum.photos/seed/fallback/100/100';
        const id = row.original.id;

        return (
          <Link to={`/product/${id}`}>
            <CardMedia
              component="img"
              sx={{
                width: 80,
                height: 80,
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
    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: true,
      meta: { filterVariant: 'text' },
      cell: ({ row, getValue }) => {
        const id = row.original.id;
        const name = getValue<string>();
        return (
          <MuiLink
            component={Link}
            to={`/product/${id}`}
            underline="hover"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 500 }}
          >
            {name}
          </MuiLink>
        );
      },
    },
    {
      accessorKey: 'categoryId',
      header: 'Category',
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: {
        filterVariant: 'select',
        selectOptions: categories.map((c) => c.id),
      },
      cell: ({ getValue }) => {
        const catId = getValue<string>();
        const cat = categories.find((c) => c.id === catId);
        return cat?.name || 'Unknown';
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: { filterVariant: 'number' },
    },
    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: { filterVariant: 'number' },
      cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
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
      header: 'Actions',
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      cell: () => (
        <Button
          startIcon={<AddShoppingCartIcon />}
          size="small"
          variant="outlined"
          onClick={() => setSnackbarOpen(true)}
        >
          Add to Cart
        </Button>
      ),
    },
  ];
}
