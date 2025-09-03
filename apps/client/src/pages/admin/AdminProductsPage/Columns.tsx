// src/pages/AdminProductsPage/Columns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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

import {
  makeNumberColumn,
  makeCurrencyColumn,
} from '../../../utils/columnPresets';

type Formatters = {
  formatCurrency: (n: number) => string;
  formatDateTime: (d: Date) => string;
};

export function buildAdminProductColumns(
  t: TFunction,
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<IProduct>[] {
  const selectOptions = categories.map((c) => ({ label: c.name, value: c.id }));

  // ── Reorder column (grip is rendered in TableBodyRows) ──────────────────────
  const reorderCol: ColumnDef<IProduct> = {
    id: '__reorder__',
    header: () => (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.6 }}
      >
        <DragIndicatorIcon fontSize="small" />
      </span>
    ),
    enableColumnFilter: false,
    enableSorting: false,
    size: 36,
    meta: { sticky: 'left' as const, align: 'center' as const },
    cell: () => null,
  };

  // ── Name (sticky left, sits immediately after the grip) ─────────────────────
  const nameCol: ColumnDef<IProduct> = {
    accessorKey: 'name',
    header: t('table.name', { defaultValue: 'Name' }),
    enableColumnFilter: true,
    enableSorting: true,
    size: 260,
    meta: { filterVariant: 'text', align: 'left', sticky: 'left' },
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
    meta: { filterVariant: 'select', align: 'left', selectOptions },
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
      { align: 'right', enableFilter: true, size: 110, hiddenOnMobile: true },
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
      { align: 'right', enableFilter: true, size: 120, hiddenOnMobile: true },
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
    meta: { filterVariant: 'date', hiddenOnMobile: true, align: 'left' },
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

  // Actions — sticky right
  const actionsCol: ColumnDef<IProduct> = {
    id: 'actions',
    header: t('table.actions', { defaultValue: 'Actions' }),
    enableColumnFilter: false,
    enableSorting: false,
    size: 140,
    meta: { sticky: 'right', align: 'left' },
    cell: ({ row }) => {
      const ctx = row.original;
      const actions: RowAction<IProduct>[] = [
        {
          id: 'edit',
          label: t('actions.edit', { defaultValue: 'Edit' }),
          icon: <EditIcon fontSize="small" />,
          onClick: (p) => navigate(`/admin/products/edit/${p.id}`),
        },
        {
          id: 'delete',
          label: t('actions.delete', { defaultValue: 'Delete' }),
          icon: <DeleteIcon fontSize="small" />,
          onClick: (p) => {
            if (
              window.confirm(t('adminProducts.confirmDelete', { name: p.name }))
            ) {
              navigate(`/admin/products/delete/${p.id}`);
            }
          },
        },
      ];
      return (
        <RowActions<IProduct>
          context={ctx}
          actions={actions}
          renderMode="auto"
          size="small"
        />
      );
    },
  };

  // Put the reorder column FIRST so the handle is always visible & not overlapped.
  return [
    reorderCol,
    nameCol,
    categoryCol,
    stockCol,
    priceCol,
    createdCol,
    actionsCol,
  ];
}

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
