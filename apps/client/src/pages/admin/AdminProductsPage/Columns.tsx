// src/pages/AdminProductsPage/Columns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { IProduct } from '@common/types';
import RowActions, { type RowAction } from '../../../components/RowActions';
import {
  betweenDateRange,
  betweenNumberRange,
} from '../../../components/StickyTable/tableFilters';

import { asDate, DASH } from '../../../utils/columns.util';
import { useLocaleFormatters } from '../../../hooks/useLocale';

// ──────────────────────────────────────────────────────────────────────────────
// Pure builder (no hooks here)
// ──────────────────────────────────────────────────────────────────────────────
type Formatters = {
  formatCurrency: (n: number) => string;
  formatDateTime: (d: Date) => string;
};

function buildProductColumns(
  t: (key: string, opts?: any) => string,
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<IProduct>[] {
  const selectOptions = categories.map((c) => ({ label: c.name, value: c.id }));

  return [
    // Name — hidden on mobile
    {
      accessorKey: 'name',
      header: t('table.name'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 240,
      meta: { filterVariant: 'text', align: 'left' },
      cell: ({ getValue }) => getValue<string>() ?? DASH,
    },

    // Category — select filter, show human name
    {
      accessorKey: 'categoryId',
      header: t('table.category'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 180,
      filterFn: 'equals',
      meta: {
        filterVariant: 'select',
        align: 'left',
        selectOptions,
      },
      cell: ({ getValue }) => {
        const catId = getValue<string>();
        const cat = categories.find((c) => c.id === catId);
        return cat?.name ?? DASH;
      },
    },

    // Stock — number range filter
    {
      accessorKey: 'stock',
      header: t('table.stock'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      filterFn: betweenNumberRange,
      meta: { filterVariant: 'number', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? v : DASH;
      },
    },

    // Price — number range filter (localized currency)
    {
      accessorKey: 'price',
      header: t('table.price'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 120,
      filterFn: betweenNumberRange,
      meta: { filterVariant: 'number', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return typeof v === 'number' ? formatCurrency(v) : DASH;
      },
    },

    // Created At — date range filter (localized)
    {
      accessorKey: 'createdAt',
      header: t('table.created'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 160,
      filterFn: betweenDateRange,
      meta: { filterVariant: 'date', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const d = asDate(getValue<unknown>() as any);
        return d ? formatDateTime(d) : DASH;
      },
    },

    // Actions — sticky right
    {
      id: 'actions',
      header: t('table.actions'),
      enableColumnFilter: false,
      enableSorting: false,
      size: 140,
      meta: { sticky: 'right', hiddenOnMobile: false, align: 'left' },
      cell: ({ row }) => {
        const ctx = row.original;
        const actions: ReadonlyArray<RowAction<IProduct>> = [
          {
            id: 'edit',
            label: t('actions.edit'),
            icon: <EditIcon fontSize="small" />,
            onClick: (p) => navigate(`/admin/products/edit/${p.id}`),
            tooltip: (p) =>
              t('adminProducts.actions.tooltipEdit', { name: p.name }),
          },
          {
            id: 'delete',
            label: t('actions.delete'),
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
            renderMode="auto" // buttons on desktop; menu on mobile
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook wrapper (call this in a component, not conditionally)
// ──────────────────────────────────────────────────────────────────────────────
export function useProductColumns(
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
): ColumnDef<IProduct>[] {
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  return React.useMemo(
    () =>
      buildProductColumns(t, categories, navigate, {
        formatCurrency,
        formatDateTime,
      }),
    [t, categories, navigate, formatCurrency, formatDateTime],
  );
}
