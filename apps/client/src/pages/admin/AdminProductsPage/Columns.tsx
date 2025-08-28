// src/pages/AdminProductsPage/Columns.ts
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { IProduct } from '@common/types';
import RowActions, { type RowAction } from '../../../components/RowActions';
import {
  betweenDateRange,
  betweenNumberRange,
} from '../../../components/StickyTable/tableFilters';

import { asDate, DASH } from '../../../utils/columns.util';
import { useLocaleFormatters } from '../../../hooks/useLocale';

// ⬇️ Reusable presets/factories
import {
  makeNumberColumn,
  createdAtColumn,
  makeCurrencyColumn,
} from '../../../utils/columnPresets'; // <-- adjust path if needed

// ──────────────────────────────────────────────────────────────────────────────
// Pure builder
// ──────────────────────────────────────────────────────────────────────────────
type Formatters = {
  formatCurrency: (n: number) => string;
  formatDateTime: (d: Date) => string;
};

function buildProductColumns(
  t: TFunction,
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
  { formatCurrency, formatDateTime }: Formatters,
): ColumnDef<IProduct>[] {
  const selectOptions = categories.map((c) => ({ label: c.name, value: c.id }));

  // Stock — reuse preset, override filter and meta/cell for this page
  const stockCol = makeNumberColumn<IProduct>('stock', t('table.stock'), {
    enableFilter: false,
    align: 'left',
    hiddenOnMobile: true,
  });

  // Price — use currency factory, then override filterFn to the actual function impl
  const priceCol: ColumnDef<IProduct> = {
    ...makeCurrencyColumn<IProduct>('price', t('table.price'), formatCurrency, {
      enableFilter: true,
      size: 120,
      align: 'left',
      hiddenOnMobile: true,
    }),
    filterFn: betweenNumberRange,
  };

  // Created At — reuse preset, override filter + localized cell
  const createdCol: ColumnDef<IProduct> = {
    ...createdAtColumn,
    size: 160,
    filterFn: betweenDateRange,
    meta: {
      ...(createdAtColumn.meta ?? {}),
      filterVariant: 'date',
      hiddenOnMobile: true,
      align: 'left',
    },
    cell: ({ getValue }) => {
      const d = asDate(getValue<unknown>());
      return d ? formatDateTime(d) : DASH;
    },
  };

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

    // Stock — number range (reused)
    stockCol,

    // Price — number range (reused + localized)
    priceCol,

    // Created At — date range (reused + localized)
    createdCol,

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
            renderMode="auto"
            menuBelow="sm"
            size="small"
          />
        );
      },
    },
  ];
}

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
