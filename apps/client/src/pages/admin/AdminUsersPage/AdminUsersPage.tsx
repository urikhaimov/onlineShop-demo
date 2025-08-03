// src/pages/admin/AdminUsersPage.tsx
import React, { useMemo, useReducer, useState } from 'react';
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

import StickyTable from '../../../components/StickyTable/StickyTable';
import { useAdminUsersQuery } from '../../../hooks/useAdminUsersQuery';
import { Role } from '../../../types/Role';
import { uiReducer, initialUIState } from './LocalUiReducer';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

export default function AdminUsersPage() {
  const { users, isLoading, error, updateUserRole, deleteUser } =
    useAdminUsersQuery();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  const columns = useMemo<ColumnDef<(typeof users)[0]>[]>(
    () => [
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <Select
            size="small"
            value={row.original.role}
            onChange={(e) =>
              updateUserRole(row.original.id, e.target.value as Role)
            }
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="superadmin">Superadmin</MenuItem>
          </Select>
        ),
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            color="error"
            variant="text"
            size="small"
            onClick={() =>
              dispatch({ type: 'OPEN_CONFIRM', payload: row.original })
            }
          >
            <Delete fontSize="small" />
          </Button>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [updateUserRole],
  );

  const handleDelete = async () => {
    if (!state.selectedUser) return;
    await deleteUser(state.selectedUser.id);
    dispatch({ type: 'CLOSE_CONFIRM' });
  };

  if (isLoading) return <Typography p={4}>Loading...</Typography>;
  if (error) return <Typography p={4}>❌ Error loading users</Typography>;

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Manage Users
        </Typography>

        <StickyTable
          data={users}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          enableColumnFilters
          enableSorting
        />

        <Dialog
          open={state.confirmOpen}
          onClose={() => dispatch({ type: 'CLOSE_CONFIRM' })}
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete{' '}
              <strong>{state.selectedUser?.email}</strong>?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => dispatch({ type: 'CLOSE_CONFIRM' })}>
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={handleDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageLayout>
  );
}
