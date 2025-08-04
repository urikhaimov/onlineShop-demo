import { ColumnDef, FilterFnOption } from '@tanstack/react-table';
import { IProduct } from '@common/types';

export const stockColumn: ColumnDef<IProduct> = {
  accessorKey: 'stock',
  header: 'Stock',
  enableColumnFilter: true,
  filterFn: 'betweenNumberRange' as FilterFnOption<IProduct>,
  meta: { filterVariant: 'number' },
};

export const priceColumn: ColumnDef<IProduct> = {
  accessorKey: 'price',
  header: 'Price',
  enableColumnFilter: true,
  filterFn: 'betweenNumberRange' as FilterFnOption<IProduct>,
  meta: { filterVariant: 'number' },
  cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}`,
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
