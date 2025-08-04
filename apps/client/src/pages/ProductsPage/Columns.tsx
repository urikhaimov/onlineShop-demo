import { ColumnDef, FilterFnOption } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { CardMedia, Button, Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { betweenNumberRange } from '../../components/StickyTable/tableFilters';
const COLUMN_WIDTHS = {
  image: 100,
  actions: 120,
  number: 60,
};

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct, any>[] {
  return [
    // ✅ 0: image
    {
      accessorKey: 'images',
      header: 'Image',

      meta: { sticky: 'left' }, // ✅ Sticky left
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.image,
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
                width: 60,
                height: 60,
                borderRadius: 1,
                objectFit: 'cover',
                mx: 'auto',
                cursor: 'pointer',
              }}
              image={firstImage}
              alt="Product"
            />
          </Link>
        );
      },
    },

    // ✅ 1: category (sticky)
    {
      accessorKey: 'categoryId',
      header: 'Category',
      enablePinning: true,
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: {
        filterVariant: 'select',
        selectOptions: categories.map((c) => c.id),
      },
      cell: () => '',
    },

    // ✅ 2: actions (sticky)

    // 👇 These will scroll
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
            sx={{ fontWeight: 500 }}
          >
            {name}
          </MuiLink>
        );
      },
    },

    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<any>,
      meta: { filterVariant: 'number' },
    },

    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<any>,
      meta: { filterVariant: 'number' },
      cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
    },
    {
      header: 'Actions',
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      meta: { sticky: 'right' }, // ✅ Sticky right
      enablePinning: true,
      size: COLUMN_WIDTHS.actions,
      cell: ({ row }) => {
        const product = row.original;
        const addToCart = useCartStore.getState().addToCart;
        return (
          <Button
            startIcon={<AddShoppingCartIcon />}
            size="small"
            variant="outlined"
            onClick={() => {
              addToCart({ ...product, quantity: 1 });
              setSnackbarOpen(true);
            }}
            disabled={product.stock <= 0}
          >
            Add to Cart
          </Button>
        );
      },
    },
  ];
}
