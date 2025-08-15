import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import StickyTable from '../../../components/StickyTable';
import { useAdminUsersQuery } from '../../../hooks/useAdminUsersQuery';
import { useAdminUsersUIStore } from '../../../stores/useAdminUsersUIStore';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import type { IUser as User, TUserRole as Role } from '@common/types';

// URL sync for table
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

// columns
import { defineUserColumns } from './Columns';

export default function AdminUsersPage() {
  const { users, isLoading, error, updateUserRole, deleteUser } =
    useAdminUsersQuery();

  // table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // external confirm dialog store (if you still use it elsewhere)
  const { openConfirm } = useAdminUsersUIStore();

  // sync table state ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  const columns = useMemo(
    () =>
      defineUserColumns({
        onChangeRole: (id: string, role: Role) => updateUserRole(id, role),
        onDeleteClicked: (user: User) => openConfirm(user),
      }),
    [updateUserRole, openConfirm],
  );

  if (isLoading) return <Typography p={4}>Loading...</Typography>;
  if (error) return <Typography p={4}>❌ Error loading users</Typography>;

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Manage Users
        </Typography>

        <StickyTable<User>
          data={users}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          enableColumnFilters
          enableSorting
        />
      </Box>
    </PageLayout>
  );
}
