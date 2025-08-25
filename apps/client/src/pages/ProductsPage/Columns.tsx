// src/pages/YourList/defineProductColumns.ts
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { Link as MuiLink } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/useCartStore';
import RowActions, { type RowAction } from '../../components/RowActions';
import { t } from 'i18next';
import i18n from '../../i18n/i18n';

import {
  DASH,
  getLocale,
  makeCurrencyFormatter,
} from '../../utils/columns.util'; // ← adjust path if needed

const COLUMN_WIDTHS = {
  image: 80,
  actions: 80,
  number: 90,
  category: 140,
  name: 220,
} as const;

export function defineProductColumns(
  categories: { id: string; name: string }[],
  setSnackbarOpen: (open: boolean) => void,
): ColumnDef<IProduct>[] {
  // Locale-aware currency formatter
  const lng = getLocale(i18n.resolvedLanguage || i18n.language);
  const formatCurrency = React.useMemo(
    () => makeCurrencyFormatter(lng, 'USD'), // change currency if needed
    [lng],
  );

  // Precompute category id → name map
  const catMap = React.useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name] as const)),
    [categories],
  );

  const addToCart = useCartStore.getState().addToCart;

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
