import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { NavigateFunction } from 'react-router-dom';

import type { IProduct } from '@common/types';
import RowActions, { type RowAction } from '../../../components/RowActions';
import {
  betweenNumberRange,
  betweenDateRange,
} from '../../../components/StickyTable/tableFilters';

import { t } from 'i18next';
import i18n from '../../../i18n/i18n';

// ──────────────────────────────────────────────────────────────────────────────
// Utils
// ──────────────────────────────────────────────────────────────────────────────
const DASH = '—';

const getLocale = () =>
  (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

const formatCurrency = (v: number, currency = 'USD') =>
  new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(v);

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(d);

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;

    // Firestore Timestamp-like { seconds, nanoseconds }
    if (typeof rec.seconds === 'number') {
      const seconds = rec.seconds as number;
      const nanos =
        typeof rec.nanoseconds === 'number' ? (rec.nanoseconds as number) : 0;
      const d = new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }

    // Firestore Timestamp with toDate()
    if (typeof (rec as any).toDate === 'function') {
      try {
        const d = (rec as { toDate: () => Date }).toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
      } catch {
        /* ignore */
      }
    }
  }

  return undefined;
}

// ──────────────────────────────────────────────────────────────────────────────

export function defineProductColumns(
  categories: { id: string; name: string }[],
  navigate: NavigateFunction,
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

    // Created At — date range filter (localized date)
    {
      accessorKey: 'createdAt',
      header: t('table.created'),
      enableColumnFilter: true,
      enableSorting: true,
      size: 160,
      filterFn: betweenDateRange,
      meta: { filterVariant: 'date', hiddenOnMobile: true, align: 'left' },
      cell: ({ getValue }) => {
        const d = toDate(getValue<unknown>());
        return d ? formatDate(d) : DASH;
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
