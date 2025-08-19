// src/pages/ProductsPage/Columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { CardMedia, Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import RowActions from '../../components/RowActions';

const COLUMN_WIDTHS = {
  image: 80,
  actions: 120,
  number: 90,
  category: 160,
  name: 240,
};

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  return [
    // Category — sticky left
    {
      accessorKey: 'categoryId',
      header: 'Category',
      size: COLUMN_WIDTHS.category,
      enableColumnFilter: false,
      meta: {
        align: 'left',
        sticky: 'left',
        hiddenOnMobile: true,
      },
      cell: ({ row }) => {
        const cat = categories.find((c) => c.id === row.original.categoryId);
        return cat?.name ?? '—';
      },
    },

    // Image — NOT sticky (avoid overlapping with Category)
    {
      accessorKey: 'images',
      header: 'Image',
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.image,
      meta: {
        /* no sticky here */
      },
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

    // Name
    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.name,
      meta: {
        /* hiddenOnMobile: true */
      }, // uncomment if you want it hidden on xs
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

    // Stock — numeric
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.number,
      meta: { align: 'left', hiddenOnMobile: true },
    },

    // Price — numeric
    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.number,
      meta: { align: 'left', hiddenOnMobile: true },
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return typeof v === 'number' ? `$${v.toFixed(2)}` : '—';
      },
    },

    // Actions — sticky RIGHT, small width
    {
      header: 'Actions',
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      size: COLUMN_WIDTHS.actions,
      meta: { sticky: 'right', align: 'left' },
      cell: ({ row }) => {
        const product = row.original;
        const addToCart = useCartStore.getState().addToCart;

        return (
          <RowActions
            context={product}
            actions={[
              {
                id: 'add',
                label: 'Add',
                icon: <AddShoppingCartIcon />,
                onClick: (p) => {
                  addToCart({ ...p, quantity: 1 });
                  setSnackbarOpen(true);
                },
                disabled: (p) => p.stock <= 0,
                tooltip: (p) => (p.stock <= 0 ? 'Out of stock' : 'Add to cart'),
              },
            ]}
            renderMode="auto"
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}
