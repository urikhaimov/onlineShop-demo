// src/pages/AdminProductsPage/Columns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Typography } from '@mui/material';
import type { NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { IProduct } from '@common/types';
import RowActions, { type RowAction } from '../../../components/RowActions';
import {
  betweenDateRange,
  betweenNumberRange,
} from '../../../components/StickyTable/tableFilters';

import { DASH } from '../../../utils/columns.util';
import { asDateLoose } from '../../../utils/date.util';
import { useLocaleFormatters } from '../../../hooks/useLocale';

// Reusable presets/factories
import {
  makeNumberColumn,
  makeCurrencyColumn,
} from '../../../utils/columnPresets'; // adjust path if needed

// ──────────────────────────────────────────────────────────────────────────────
// Pure builder (NO hooks)
// ──────────────────────────────────────────────────────────────────────────────
type Formatters = {
  formatCurrency: (n: number) => string; // MAJOR units
  formatDateTime: (d: Date) => string;
};

export function buildAdminProductColumns(
  t: TFunction,
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<IProduct>[] {
  const selectOptions = categories.map((c) => ({ label: c.name, value: c.id }));

  // Name — sticky left
  const nameCol: ColumnDef<IProduct> = {
    accessorKey: 'name',
    header: t('table.name', { defaultValue: 'Name' }),
    enableColumnFilter: true,
    enableSorting: true,
    size: 260,
    meta: {
      filterVariant: 'text',
      align: 'left' as const,
      sticky: 'left' as const,
    },
    cell: ({ getValue }) => getValue<string>() ?? DASH,
  };

  // Category — select filter, show human name
  const categoryCol: ColumnDef<IProduct> = {
    accessorKey: 'categoryId',
    header: t('table.category', { defaultValue: 'Category' }),
    enableColumnFilter: true,
    enableSorting: true,
    size: 180,
    filterFn: 'equals',
    meta: {
      filterVariant: 'select',
      align: 'left' as const,
      selectOptions,
    },
    cell: ({ getValue }) => {
      const id = getValue<string>();
      return categories.find((c) => c.id === id)?.name ?? DASH;
    },
  };

  // Stock — number range
  const stockCol: ColumnDef<IProduct> = {
    ...makeNumberColumn<IProduct>(
      'stock',
      t('table.stock', { defaultValue: 'Stock' }),
      {
        align: 'right',
        enableFilter: true,
        size: 110,
        hiddenOnMobile: true,
      },
    ),
    meta: { filterVariant: 'number' },
    filterFn: betweenNumberRange,
  };

  // Price — currency + number range
  const priceCol: ColumnDef<IProduct> = {
    ...makeCurrencyColumn<IProduct>(
      'price',
      t('table.price', { defaultValue: 'Price' }),
      formatCurrency,
      {
        align: 'right',
        enableFilter: true,
        size: 120,
        hiddenOnMobile: true,
      },
    ),
    filterFn: betweenNumberRange,
    meta: { filterVariant: 'number' },
  };

  // Created At — date range; robust parsing with metadata fallback
  const createdCol: ColumnDef<IProduct> = {
    accessorKey: 'createdAt',
    header: t('table.createdAt', { defaultValue: 'Created At' }),
    size: 180,
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: betweenDateRange,
    meta: {
      filterVariant: 'date',
      hiddenOnMobile: true,
      align: 'left' as const,
    },
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

  // Actions — sticky right (NOTE: use mutable array type to avoid TS readonly error)
  const actionsCol: ColumnDef<IProduct> = {
    id: 'actions',
    header: t('table.actions', { defaultValue: 'Actions' }),
    enableColumnFilter: false,
    enableSorting: false,
    size: 140,
    meta: {
      sticky: 'right' as const,
      hiddenOnMobile: false,
      align: 'left' as const,
    },
    cell: ({ row }) => {
      const ctx = row.original;
      const actions: RowAction<IProduct>[] = [
        {
          id: 'edit',
          label: t('actions.edit', { defaultValue: 'Edit' }),
          icon: <EditIcon fontSize="small" />,
          onClick: (p) => navigate(`/admin/products/edit/${p.id}`),
          tooltip: (p) =>
            t('adminProducts.actions.tooltipEdit', { name: p.name }),
        },
        {
          id: 'delete',
          label: t('actions.delete', { defaultValue: 'Delete' }),
          icon: <DeleteIcon fontSize="small" />,
          onClick: (p) => {
            const ok = window.confirm(
              t('adminProducts.confirmDelete', { name: p.name }),
            );
            if (ok) navigate(`/admin/products/delete/${p.id}`);
          },
          tooltip: (p) =>
            t('adminProducts.actions.tooltipDelete', { name: p.name }),
        },
      ];

      return (
        <RowActions<IProduct>
          context={ctx}
          actions={actions}
          renderMode="auto"
          menuBelow="sm"
          size="small"
        />
      );
    },
  };

  return [nameCol, categoryCol, stockCol, priceCol, createdCol, actionsCol];
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook wrapper (use this in the page)
// ──────────────────────────────────────────────────────────────────────────────
export function useProductColumns(
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
): ColumnDef<IProduct>[] {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  return React.useMemo(
    () =>
      buildAdminProductColumns(t, categories, navigate, {
        formatCurrency,
        formatDateTime,
      }),
    [t, categories, navigate, formatCurrency, formatDateTime],
  );
}

// Optional pure factory (no hooks) — if you ever need it
export function defineAdminProductColumnsPure(
  tFn: TFunction,
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
  formatCurrency: (n: number) => string,
  formatDateTime: (d: Date) => string,
): ColumnDef<IProduct>[] {
  return buildAdminProductColumns(tFn, categories, navigate, {
    formatCurrency,
    formatDateTime,
  });
}
