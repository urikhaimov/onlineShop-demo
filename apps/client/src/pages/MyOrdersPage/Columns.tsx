import { ColumnDef } from '@tanstack/react-table';
import { Order } from './LocalReducer';
import { Typography } from '@mui/material';
import { format } from 'date-fns';

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
    cell: (info) => {
      const value = info.getValue();
      const date =
        typeof value === 'object' && 'toDate' in value
          ? value.toDate()
          : new Date();
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
    cell: (info) => (
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ textTransform: 'capitalize' }}
      >
        {info.getValue<string>() || '—'}
      </Typography>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Total ($)',
    cell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        ${row.getValue<number>('amount')?.toFixed?.(2) ?? '—'}
      </Typography>
    ),
  },
];
