import { ColumnDef, FilterFnOption } from '@tanstack/react-table';
import { IProduct } from '@common/types';
import { CardMedia, Button, Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { betweenNumberRange } from '../../components/StickyTable/tableFilters';

const COLUMN_WIDTHS = {
  image: 80,
  actions: 50,
  number: 70,
  category: 100,
};

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct, any>[] {
  return [
    // ✅ Category (used as groupBy)
    {
      accessorKey: 'categoryId',
      header: 'Category',
      enablePinning: true,
      size: COLUMN_WIDTHS.category,
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: {
        sticky: 'left',
        filterVariant: 'select',
        selectOptions: categories.map((c) => c.id),
      },
      cell: () => '',
    },

    // ✅ Product image
    {
      accessorKey: 'images',
      header: 'Image',
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.image,
      meta: { sticky: 'left' },
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
                ml: 0,
                mr: 'auto',
                objectFit: 'cover',
                cursor: 'pointer',
              }}
              image={firstImage}
              alt="Product"
            />
          </Link>
        );
      },
    },

    // ✅ Product name
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

    // ✅ Stock (number range filter, right-aligned)
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<any>,
      meta: { filterVariant: 'number', align: 'left' },
    },

    // ✅ Price (number range filter, right-aligned)
    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<any>,
      meta: { filterVariant: 'number', align: 'left' },
      cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
    },

    // ✅ Actions (sticky right, compact)
    {
      header: 'Actions',
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      enablePinning: true,
      size: COLUMN_WIDTHS.actions,
      meta: { sticky: 'right' },
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
          ></Button>
        );
      },
    },
  ];
}
