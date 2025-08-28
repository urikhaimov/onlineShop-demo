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
import type { TFunction } from 'i18next';

import { DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';

// Reusable presets/factories
import {
  makeNumberColumn,
  makeCurrencyColumn,
} from '../../utils/columnPresets'; // <-- adjust path if needed

const COLUMN_WIDTHS = {
  image: 80,
  actions: 80,
  number: 90,
  category: 140,
  name: 220,
} as const;

// ---------- Pure builder (NO hooks here) ----------
function buildUserProductColumns(
  t: TFunction,
  categories: { id: string; name: string }[],
  formatCurrency: (n: number) => string,
  addToCart: (p: IProduct & { quantity?: number }) => void,
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  const catMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name] as const),
  );

  // Reuse base stock column and tailor for this page
  const stockCol = makeNumberColumn<IProduct>('stock', t('table.stock'), {
    enableFilter: false,
    size: COLUMN_WIDTHS.number,
    align: 'left',
    hiddenOnMobile: true,
  });

  // Price — use currency factory (localized), no filter on this page
  const priceCol: ColumnDef<IProduct> = makeCurrencyColumn<IProduct>(
    'price',
    t('table.price'),
    formatCurrency,
    {
      enableFilter: false,
      size: COLUMN_WIDTHS.number,
      align: 'left',
      hiddenOnMobile: true,
    },
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

    // Stock — reused
    stockCol,

    // Price — reused via factory + localized
    priceCol,

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
