import { ColumnDef, FilterFnOption } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { CardMedia, Button, Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import { betweenNumberRange } from '../../components/StickyTable/tableFilters';
import RowActions from '../../components/RowActions';

import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
const COLUMN_WIDTHS = {
  image: 80,
  actions: 120,
  number: 90,
  category: 140,
  name: 220,
};

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  return [
    // Category (groupBy) — visible on mobile, sticky left
    {
      accessorKey: 'categoryId',
      header: 'Category',
      size: COLUMN_WIDTHS.category,
      enableColumnFilter: true,
      filterFn: 'equals',
      meta: {
        align: 'left',
        sticky: 'left',
        filterVariant: 'select',
        selectOptions: categories.map((c) => ({
          label: c.name,
          value: c.id,
        })) as { label: string; value: string }[], // <-- ✅ Fix
      },
      cell: ({ row }) => {
        const cat = categories.find((c) => c.id === row.original.categoryId);
        return cat?.name ?? '—';
      },
    },

    // Image — visible on mobile, sticky left
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

    // Name — hidden on mobile
    {
      accessorKey: 'name',
      header: 'Name',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.name,
      meta: { filterVariant: 'text', hiddenOnMobile: true },
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

    // Stock — hidden on mobile, number range filter + slider
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<IProduct>,
      meta: {
        filterVariant: 'number',
        align: 'left',
        hiddenOnMobile: true,
        numberRange: { min: 0, max: 100000, step: 1 },
      },
    },

    // Price — hidden on mobile, number range filter + slider
    {
      accessorKey: 'price',
      header: 'Price',
      enableColumnFilter: true,
      size: COLUMN_WIDTHS.number,
      filterFn: betweenNumberRange as FilterFnOption<IProduct>,
      meta: {
        filterVariant: 'number',
        align: 'left',
        hiddenOnMobile: true,
        numberRange: { min: 0, max: 100000, step: 1 },
      },
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return typeof v === 'number' ? `$${v.toFixed(2)}` : '—';
      },
    },

    // Actions — visible on mobile, sticky right
    {
      header: 'Actions',
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      size: 120,
      meta: { sticky: 'left', align: 'left' },
      cell: ({ row }) => {
        const product = row.original;
        const addToCart = useCartStore.getState().addToCart;
        const navigate = useNavigate(); // if you're inside a component; otherwise wrap with <Link>

        return (
          <RowActions
            context={product}
            actions={[
              {
                id: 'add',
                label: 'Add',
                icon: <AddShoppingCartIcon />,
                onClick: (p) => addToCart({ ...p, quantity: 1 }),
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
