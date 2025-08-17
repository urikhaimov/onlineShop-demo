import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  Select,
  MenuItem,
} from '@mui/material';
import StickyTable from '../../../components/StickyTable';
import { useAdminUsersQuery } from '../../../hooks/useAdminUsersQuery';
import { useAdminUsersUIStore } from '../../../stores/useAdminUsersUIStore'; // (optional; can be removed if unused)
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

  // If you no longer need the external confirm, you can remove this store
  const { openConfirm } = useAdminUsersUIStore();

  // sync table state ↔ URL
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });

  // --- Edit role dialog state ---
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>('user');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // --- Delete dialog state ---
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      defineUserColumns({
        onChangeRole: (id: string, role: Role) => updateUserRole(id, role), // inline select still works
        onEditClicked: (user: User) => {
          setEditError(null);
          setEditUser(user);
          setEditRole(user.role);
        },
        onDeleteClicked: (user: User) => {
          setDeleteError(null);
          setToDelete(user);
          // If you prefer the old external confirm, call: openConfirm(user)
        },
      }),
    [updateUserRole, openConfirm],
  );

  const handleSaveRole = async () => {
    if (!editUser) return;
    setEditBusy(true);
    setEditError(null);
    try {
      if (editUser.role !== editRole) {
        await updateUserRole(editUser.id, editRole);
      }
      setEditUser(null);
    } catch (e) {
      if (e instanceof Error) setEditError(e.message);
      else if (typeof e === 'string') setEditError(e);
      else setEditError('Failed to update role.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteUser(toDelete.id);
      setToDelete(null);
    } catch (e) {
      if (e instanceof Error) setDeleteError(e.message);
      else if (typeof e === 'string') setDeleteError(e);
      else setDeleteError('Failed to delete user.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (isLoading) return <Typography p={4}>Loading...</Typography>;
  if (error) return <Typography p={4}>❌ Error loading users</Typography>;

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={5} py={4}>
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

      {/* Edit role dialog */}
      <Dialog
        open={Boolean(editUser)}
        onClose={() => (editBusy ? null : setEditUser(null))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit role</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Change role for <strong>{editUser?.email}</strong>
            </Typography>
            <Select
              size="small"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as Role)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
            </Select>
            {editError && (
              <Alert severity="error" variant="filled">
                {editError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditUser(null)}
            disabled={editBusy}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveRole}
            disabled={editBusy || !editUser || editUser.role === editRole}
            variant="contained"
          >
            {editBusy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(toDelete)}
        onClose={() => (deleteBusy ? null : setToDelete(null))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning" variant="outlined">
              This will permanently delete the user account. This action cannot
              be undone.
            </Alert>
            <Typography variant="body2">
              Are you sure you want to delete <strong>{toDelete?.email}</strong>
              ?
            </Typography>
            {deleteError && (
              <Alert severity="error" variant="filled">
                {deleteError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setToDelete(null)}
            disabled={deleteBusy}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={deleteBusy}
            color="error"
            variant="contained"
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
