// src/pages/YourList/defineProductColumns.ts
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import RowActions, { type RowAction } from '../../components/RowActions';
import { useTranslation } from 'react-i18next';

import { DASH } from '../../utils/columns.util'; // placeholder symbol
import { useLocaleFormatters } from '../../hooks/useLocale'; // ✅ useLocale hook

const COLUMN_WIDTHS = {
  image: 80,
  actions: 80,
  number: 90,
  category: 140,
  name: 220,
} as const;

// ---------- Pure builder (NO hooks here) ----------
type Formatters = {
  formatCurrency: (n: number) => string;
};

function buildUserProductColumns(
  t: (key: string, opts?: any) => string,
  categories: { id: string; name: string }[],
  formatCurrency: (n: number) => string,
  addToCart: (p: IProduct & { quantity?: number }) => void,
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  const catMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name] as const),
  );

  return [
    // Category — sticky left
    {
      accessorKey: 'categoryId',
      header: t('table.category'),
      size: COLUMN_WIDTHS.category,
      enableColumnFilter: false,
      meta: { align: 'left', sticky: 'left', hiddenOnMobile: true },
      cell: ({ row }) => catMap[row.original.categoryId] ?? DASH,
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
        const name = getValue<string>() ?? DASH;
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
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? v : DASH;
      },
    },

    // Price — numeric + localized currency
    {
      accessorKey: 'price',
      header: t('table.price'),
      enableColumnFilter: false,
      size: COLUMN_WIDTHS.number,
      meta: { align: 'left', hiddenOnMobile: true },
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? formatCurrency(v) : DASH;
      },
    },

    // Actions — sticky RIGHT
    {
      id: 'actions',
      header: t('table.actions'),
      enableColumnFilter: false,
      enableSorting: false,
      size: COLUMN_WIDTHS.actions,
      meta: { sticky: 'right', align: 'left', alwaysVisible: true },
      cell: ({ row }) => {
        const product = row.original;

        const actions: RowAction<IProduct>[] = [
          {
            id: 'add',
            label: t('table.addToCart'),
            icon: <AddShoppingCartIcon />,
            onClick: (p) => {
              addToCart({ ...p, quantity: 1 });
              setSnackbarOpen(true);
            },
            disabled: (p) => (p?.stock ?? 0) <= 0,
            tooltip: (p) =>
              (p?.stock ?? 0) <= 0
                ? t('table.outOfStock')
                : t('table.addToCart'),
          },
        ];

        return <RowActions context={product} actions={actions} />;
      },
    },
  ];
}

// ---------- Hook wrapper (call inside components) ----------
export function useProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();

  const addToCart = useCartStore.getState().addToCart;

  return React.useMemo(
    () =>
      buildUserProductColumns(
        t,
        categories,
        formatCurrency,
        addToCart,
        setSnackbarOpen,
      ),
    [t, categories, formatCurrency, addToCart, setSnackbarOpen],
  );
}
