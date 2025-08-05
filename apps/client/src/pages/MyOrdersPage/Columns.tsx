import { ColumnDef } from '@tanstack/react-table';
import { TOrder as Order } from '@common/types';
import { Typography } from '@mui/material';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import {
  betweenDateRange,
  betweenNumberRange,
} from '../../components/StickyTable/tableFilters';

export const defineOrderColumns = (): ColumnDef<Order>[] => [
  {
    accessorKey: 'id',
    header: 'Order ID',
    enableColumnFilter: false,
    cell: (info) => (
      <Typography
        variant="body2"
        sx={{ maxWidth: 160, wordBreak: 'break-all' }}
      >
        {info.getValue<string>()}
      </Typography>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Customer Email',
    cell: (info) => (
      <Typography
        variant="body2"
        sx={{ maxWidth: 200, wordBreak: 'break-word' }}
      >
        {info.getValue<string>() || '—'}
      </Typography>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    filterFn: betweenDateRange,
    meta: { filterVariant: 'date' },
    cell: (info) => {
      const rawValue = info.getValue();
      let date: Date;

      if (rawValue instanceof Date) {
        date = rawValue;
      } else if (
        typeof rawValue === 'object' &&
        rawValue !== null &&
        'toDate' in rawValue &&
        typeof (rawValue as Timestamp).toDate === 'function'
      ) {
        date = (rawValue as Timestamp).toDate();
      } else {
        date = new Date(); // fallback
      }

      return (
        <Typography variant="body2" color="text.secondary">
          {format(date, 'PPpp')}
        </Typography>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableColumnFilter: true,
    filterFn: 'equals',
    meta: {
      filterVariant: 'select',
      selectOptions: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
      ] as { label: string; value: string }[],
    },
    cell: ({ row }) => {
      const value = row.getValue<string>('status');
      return (
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ textTransform: 'capitalize' }}
        >
          {value || '—'}
        </Typography>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Total ($)',
    filterFn: betweenNumberRange,
    meta: { filterVariant: 'number', align: 'left' },
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        ${row.getValue<number>('amount')?.toFixed?.(2) ?? '—'}
      </Typography>
    ),
  },
];
