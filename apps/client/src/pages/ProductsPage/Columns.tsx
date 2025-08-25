import { ColumnDef } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import RowActions from '../../components/RowActions';
import { t } from 'i18next';
import i18n from '../../i18n/i18n';

const COLUMN_WIDTHS = {
  image: 80,
  actions: 80,
  number: 90,
  category: 140,
  name: 220,
};

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  return [
    // Category — sticky left
    {
      accessorKey: 'categoryId',
      header: t('table.category'),
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

    // Name
    {
      accessorKey: 'name',
      header: t('table.name'),
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.name,
      meta: {},
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
      header: t('table.stock'),
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.number,
      meta: { align: 'left', hiddenOnMobile: true },
    },

    // Price — numeric + localized currency
    {
      accessorKey: 'price',
      header: t('table.price'),
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.number,
      meta: { align: 'left', hiddenOnMobile: true },
      cell: ({ getValue }) => {
        const v = getValue<number>();
        if (typeof v !== 'number') return '—';
        const lng = (i18n.language || 'en').split('-')[0];
        return new Intl.NumberFormat(lng, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 2,
        }).format(v);
      },
    },

    // Actions — sticky RIGHT
    {
      header: t('table.actions'),
      id: 'actions',
      enableColumnFilter: false,
      enableSorting: false,
      size: COLUMN_WIDTHS.actions,
      meta: { sticky: 'right', align: 'left', alwaysVisible: true },
      cell: ({ row }) => {
        const product = row.original;
        const addToCart = useCartStore.getState().addToCart;

        return (
          <RowActions
            context={product}
            actions={[
              {
                id: 'add',
                label: t('table.addToCart'),
                icon: <AddShoppingCartIcon />,
                onClick: (p) => {
                  addToCart({ ...p, quantity: 1 });
                  setSnackbarOpen(true);
                },
                disabled: (p) => p.stock <= 0,
                tooltip: (p) =>
                  p.stock <= 0 ? t('table.outOfStock') : t('table.addToCart'),
              },
            ]}
          />
        );
      },
    },
  ];
}
