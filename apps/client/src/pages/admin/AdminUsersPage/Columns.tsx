// src/pages/admin/users/Columns.tsx
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Box } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { IUser as User, TUserRole as Role } from '@common/types';
import ActionRow, { type RowAction } from '../../../components/RowActions';
import { useTranslation } from 'react-i18next';
import { t } from 'i18next';

type Options = {
  onChangeRole: (id: string, role: Role) => Promise<void> | void;
  onEditClicked: (user: User) => void;
  onDeleteClicked: (user: User) => void;
};

/** Separate component so we can use hooks safely inside the cell */
function RoleSelectCell({
  user,
  onChangeRole,
}: {
  user: User;
  onChangeRole: (id: string, role: Role) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = React.useState<Role>(user.role);
  const [saving, setSaving] = React.useState(false);

  // keep in sync if external data changes (after refetch, etc.)
  React.useEffect(() => {
    setValue(user.role);
  }, [user.role]);

  const handleChange = (e: SelectChangeEvent) => {
    const next = e.target.value as Role; // 'user' | 'admin' | 'superadmin'
    setValue(next); // optimistic UI
    setSaving(true);

    (async () => {
      try {
        await onChangeRole(user.id, next);
      } catch {
        setValue(user.role); // revert on error (optional)
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    // Stop row-level handlers (expand/select on row click) from interfering
    <Box
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Select
        size="small"
        value={value}
        onChange={handleChange}
        disabled={saving}
        sx={{ minWidth: 120 }}
        MenuProps={{ disablePortal: true }}
      >
        <MenuItem value="user">{t('adminUsers.roles.user')}</MenuItem>
        <MenuItem value="admin">{t('adminUsers.roles.admin')}</MenuItem>
        <MenuItem value="superadmin">
          {t('adminUsers.roles.superadmin')}
        </MenuItem>
      </Select>
    </Box>
  );
}

export function defineUserColumns(opts: Options): ColumnDef<User>[] {
  return [
    // Email — visible on mobile, sticky left, filterable
    {
      header: t('adminUsers.columns.email'),
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

    // Role — hidden on mobile; inline select with optimistic update
    {
      header: t('adminUsers.columns.role'),
      accessorKey: 'role',
      enableSorting: true,
      enableColumnFilter: false,
      size: 160,
      meta: { hiddenOnMobile: true, align: 'left' },
      cell: ({ row }) => (
        <RoleSelectCell user={row.original} onChangeRole={opts.onChangeRole} />
      ),
    },

    // Actions — visible on mobile, sticky right
    {
      id: 'actions',
      header: t('table.actions'), // or t('adminUsers.columns.actions')
      enableSorting: false,
      enableColumnFilter: false,
      size: 100,
      meta: {
        sticky: 'right',
        align: 'left',
        hiddenOnMobile: false,
      },
      cell: ({ row }) => {
        const ctx = row.original;
        const actions: ReadonlyArray<RowAction<User>> = [
          {
            id: 'edit',
            label: t('adminUsers.actions.editRole'),
            icon: <EditIcon fontSize="small" />,
            tooltip: (u) =>
              t('adminUsers.actions.tooltipEditRole', { email: u.email }),
            onClick: (u) => opts.onEditClicked(u),
          },
          {
            id: 'delete',
            label: t('adminUsers.actions.delete'),
            icon: <DeleteIcon fontSize="small" />,
            danger: true,
            tooltip: (u) =>
              t('adminUsers.actions.tooltipDelete', { email: u.email }),
            onClick: (u) => opts.onDeleteClicked(u),
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
