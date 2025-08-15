import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { IUser as User, TUserRole as Role } from '@common/types';

// Reusable row actions (default export), plus its type
import ActionRow, { type RowAction } from '../../../components/RowActions';

type Options = {
  onChangeRole: (id: string, role: Role) => void;
  onDeleteClicked: (user: User) => void;
};

export function defineUserColumns(opts: Options): ColumnDef<User>[] {
  return [
    // Email — visible on mobile, sticky left, filterable
    {
      header: 'Email',
      accessorKey: 'email',
      enableSorting: true,
      enableColumnFilter: true,
      size: 260,
      meta: {
        sticky: 'left',
        align: 'left',
        filterVariant: 'text',
        hiddenOnMobile: false,
      },
      cell: (info) => info.getValue<string>() ?? '—',
    },

    // Role — hidden on mobile
    {
      header: 'Role',
      accessorKey: 'role',
      enableSorting: true,
      enableColumnFilter: false,
      size: 160,
      meta: {
        hiddenOnMobile: true,
        align: 'left',
      },
      cell: ({ row }) => {
        const value = row.original.role;
        return (
          <Select
            size="small"
            value={value}
            onChange={(e) =>
              opts.onChangeRole(row.original.id, e.target.value as Role)
            }
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="superadmin">Superadmin</MenuItem>
          </Select>
        );
      },
    },

    // Actions — visible on mobile, sticky right; uses ActionRow (RowActions)
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      size: 120,
      meta: {
        sticky: 'right',
        align: 'right',
        hiddenOnMobile: false,
      },
      cell: ({ row }) => {
        const ctx = row.original;
        const actions: ReadonlyArray<RowAction<User>> = [
          {
            id: 'delete',
            label: 'Delete',
            icon: <DeleteIcon fontSize="small" />,
            danger: true,
            // use your external confirm flow (store/dialog)
            onClick: (u) => opts.onDeleteClicked(u),
            tooltip: (u) => `Delete ${u.email}`,
          },
        ];
        return (
          <ActionRow<User>
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
