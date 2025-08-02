import { ColumnDef } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { CardMedia, Button, Typography, Link as MuiLink } from '@mui/material';
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
              alt="Product Image"
            />
          </Link>
        );
      },
      enableColumnFilter: false,
    },
    {
      header: 'Name',
      accessorKey: 'name',
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
      enableColumnFilter: true,
    },
    {
      header: 'Category',
      accessorKey: 'categoryId',
      cell: ({ getValue }) => {
        const catId = getValue<string>();
        const cat = categories.find((c) => c.id === catId);
        return cat?.name || 'Unknown';
      },
      enableColumnFilter: false,
    },
    {
      header: 'Stock',
      accessorKey: 'stock',
      enableColumnFilter: true,
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
      enableColumnFilter: true,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          startIcon={<AddShoppingCartIcon />}
          size="small"
          variant="outlined"
          onClick={() => setSnackbarOpen(true)}
        >
          Add to Cart
        </Button>
      ),
      enableColumnFilter: false,
      enableSorting: false,
    },
  ];
}
