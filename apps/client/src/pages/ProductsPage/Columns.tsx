// src/pages/ProductsPage/Columns.tsx
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { IProduct } from '@common/types';
import { Typography, IconButton, Tooltip, Button } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { makeCurrencyColumn } from '../../utils/columnPresets';
import { DASH } from '../../utils/columns.util';
import { asDateLoose } from '../../utils/date.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useCartStore } from '../../stores/useCartStore';

type Category = { id: string; name: string };

type Formatters = {
  formatCurrency: (n: number) => string; // expects MAJOR units
  formatDateTime: (d: Date) => string;
};

/**
 * PURE builder (no hooks). Name as requested: buildUserProductColumns
 */
export function buildUserProductColumns(
  t: TFunction,
  { formatCurrency, formatDateTime }: Formatters,
  categories: Category[],
  onAddedToCart?: () => void,
): ColumnDef<IProduct>[] {
  const categoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? DASH;

  const priceCol: ColumnDef<IProduct> = makeCurrencyColumn<IProduct>(
    'price',
    t('table.price', { defaultValue: 'Price' }),
    formatCurrency,
    {
      align: 'right',
      enableFilter: false,
      hiddenOnMobile: true,
    },
  );

  const createdCol: ColumnDef<IProduct> = {
    accessorKey: 'createdAt',
    header: t('table.createdAt', { defaultValue: 'Created At' }),
    size: 180,
    enableColumnFilter: false,
    enableSorting: true,
    meta: { hiddenOnMobile: true, align: 'left' as const },
    cell: ({ row }) => {
      const d =
        asDateLoose((row.original as any).createdAt) ??
        asDateLoose(row.original?.metadata?.updatedAt as any) ??
        asDateLoose(row.original?.metadata?.createdAt as any);
      return (
        <Typography variant="body2" color="text.secondary">
          {d ? formatDateTime(d) : DASH}
        </Typography>
      );
    },
  };

  return [
    // Category (for grouping; shows the readable name)
    {
      accessorKey: 'categoryId',
      header: t('table.category', { defaultValue: 'Category' }),
      size: 160,
      enableColumnFilter: false,
      meta: {
        sticky: 'left' as const,
        align: 'left' as const,
        hiddenOnMobile: true,
      },
      cell: ({ getValue }) => (
        <Typography variant="body2">
          {categoryName(getValue<string>())}
        </Typography>
      ),
    },

    // Name
    {
      accessorKey: 'name',
      header: t('table.name', { defaultValue: 'Name' }),
      enableColumnFilter: false,
      enableSorting: true,
      meta: { align: 'left' as const },
      size: 260,
      cell: (info) => (
        <Typography
          variant="body2"
          sx={{ maxWidth: 240, wordBreak: 'break-word' }}
        >
          {info.getValue<string>() ?? DASH}
        </Typography>
      ),
    },

    // Stock
    {
      accessorKey: 'stock',
      header: t('table.stock', { defaultValue: 'Stock' }),
      enableColumnFilter: false,
      enableSorting: true,
      meta: { align: 'left' as const },
      size: 100,
      cell: ({ getValue }) => (
        <Typography variant="body2">{getValue<number>() ?? 0}</Typography>
      ),
    },

    priceCol,
    createdCol,

    // Actions (Add to cart)
    {
      id: 'actions',
      header: t('table.actions', { defaultValue: 'Actions' }),
      size: 80,
      enableColumnFilter: false,
      enableSorting: false,
      meta: { align: 'right' as const, sticky: 'right' as const },
      cell: ({ row }) => {
        const product = row.original;
        const label = t('actions.addToCart', { defaultValue: 'Add to cart' });
        return (
          <Tooltip title={label}>
            <Button
              size="small"
              aria-label={label}
              data-testid="add-to-cart"
              onClick={() => {
                // add minimal required fields for your cart item
                useCartStore.getState().addToCart({
                  id: product.id!,
                  name: product.name,
                  price: Number(product.price ?? 0),
                  image:
                    (product.images?.[0] as any)?.url ?? product.imageUrl ?? '',
                  quantity: 1,
                  productId: product.id!,
                } as any);
                onAddedToCart?.();
              }}
            >
              <AddShoppingCartIcon fontSize="small" />
            </Button>
          </Tooltip>
        );
      },
    },
  ];
}

/**
 * Hook wrapper used by your page:
 *   const columns = useProductColumns(categories, setSnackbarOpen);
 */
export function useProductColumns(
  categories: Category[],
  onAddedToCart?: () => void,
): ColumnDef<IProduct>[] {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  return React.useMemo(
    () =>
      buildUserProductColumns(
        t,
        { formatCurrency, formatDateTime },
        categories,
        onAddedToCart,
      ),
    [t, formatCurrency, formatDateTime, categories, onAddedToCart],
  );
}

/**
 * Optional pure factory (no hooks), if you ever need it.
 */
export function defineUserProductColumnsPure(
  tFn: TFunction,
  formatCurrency: (n: number) => string,
  formatDateTime: (d: Date) => string,
  categories: Category[],
  onAddedToCart?: () => void,
): ColumnDef<IProduct>[] {
  return buildUserProductColumns(
    tFn,
    { formatCurrency, formatDateTime },
    categories,
    onAddedToCart,
  );
}
