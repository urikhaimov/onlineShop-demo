import { type ColumnDef, type FilterFnOption } from '@tanstack/react-table';
import { IProduct } from '@common/types';

// src/components/columns/productColumns.ts

export function makeCurrencyColumn<T extends object>(
  key: keyof T,
  header: string,
  formatCurrency: (n: number) => string,
  opts?: {
    enableFilter?: boolean;
    size?: number;
    align?: 'left' | 'center' | 'right';
    hiddenOnMobile?: boolean;
  },
): ColumnDef<T> {
  return {
    accessorKey: String(key),
    header,
    enableColumnFilter: opts?.enableFilter ?? true,
    size: opts?.size,
    filterFn: 'betweenNumberRange' as FilterFnOption<T>,
    meta: {
      filterVariant: 'number',
      align: opts?.align ?? 'right',
      hiddenOnMobile: opts?.hiddenOnMobile ?? false,
    },
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return typeof v === 'number' ? formatCurrency(v) : '—';
    },
  };
}
export const stockColumn: ColumnDef<IProduct> = {
  accessorKey: 'stock',
  header: 'Stock',
  enableColumnFilter: true,
  filterFn: 'betweenNumberRange' as FilterFnOption<IProduct>,
  meta: { filterVariant: 'number' },
};
export const createdAtColumn: ColumnDef<IProduct> = {
  accessorKey: 'createdAt',
  header: 'Created At',
  enableColumnFilter: true,
  filterFn: 'betweenDateRange' as FilterFnOption<IProduct>,
  meta: { filterVariant: 'date' },
  cell: ({ getValue }) => {
    const raw = getValue<string | Date>();
    const date = new Date(raw);
    return isNaN(date.getTime())
      ? 'N/A'
      : date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
  },
};
