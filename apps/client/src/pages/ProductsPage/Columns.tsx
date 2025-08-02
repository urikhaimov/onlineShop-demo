// src/pages/ProductsPage/Columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { CardMedia, Button } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct, any>[] {
  return [
    {
      accessorKey: 'images',
      header: 'Image',
      cell: (info) => {
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
      header: 'Name',
      accessorKey: 'name',
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
      enableColumnFilter: true,
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
