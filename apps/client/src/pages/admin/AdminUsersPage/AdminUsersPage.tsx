import React, { useMemo, useReducer, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  VariableSizeList as List,
  type ListChildComponentProps,
} from 'react-window';
import PageWithStickyFilters from '../../../layouts/PageWithStickyFilters';
import useDebounce from '../../../hooks/useDebouncedValue';
import { useAdminUsersQuery } from '../../../hooks/useAdminUsersQuery';
import { initialUIState, uiReducer } from './LocalUiReducer';
import { Role } from '../../../types/Role';
import LoadingProgress from '../../../components/LoadingProgress';
import AdminUsersFilters from './AdminUsersFilters';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
const CARD_HEIGHT = 112; // Adjust for cleaner spacing

export default function AdminUsersPage() {
  const { users, isLoading, error, updateUserRole, deleteUser } =
    useAdminUsersQuery();

  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.email.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [users, debouncedSearch],
  );

  const listRef = useRef<List>(null);

  const handleDelete = async () => {
    if (!state.selectedUser) return;
    await deleteUser(state.selectedUser.id);
    dispatch({ type: 'CLOSE_CONFIRM' });
  };

  const renderRow = ({ index, style }: ListChildComponentProps) => {
    const user = filteredUsers[index];

    return (
      <div style={{ ...style, padding: 8 }}>
        <Card sx={{ p: 2 }}>
          <CardContent sx={{ pb: 0 }}>
            <Tooltip title={user.email}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {user.email}
              </Typography>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">
              Role: {user.role}
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', pt: 1 }}>
            <Select
              size="small"
              value={user.role}
              onChange={(e) => updateUserRole(user.id, e.target.value as Role)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
            </Select>
            <IconButton
              edge="end"
              color="error"
              onClick={() => dispatch({ type: 'OPEN_CONFIRM', payload: user })}
            >
              <DeleteIcon />
            </IconButton>
          </CardActions>
        </Card>
      </div>
    );
  };

  if (isLoading) return <LoadingProgress />;
  if (error) return <Typography p={4}>❌ Error loading users</Typography>;

  const hasFilters = !!searchText;

  return (
    <PageWithStickyFilters
      title="Manage Users"
      sidebar={
        <AdminUsersFilters
          searchText={searchText}
          setSearchText={(text) => {
            setSearchText(text);
            listRef.current?.scrollToItem(0);
          }}
          total={filteredUsers.length}
        />
      }
      mobileOpen={state.mobileDrawerOpen}
      onMobileOpen={() => dispatch({ type: 'OPEN_MOBILE_DRAWER' })}
      onMobileClose={() => dispatch({ type: 'CLOSE_MOBILE_DRAWER' })}
      hasFilters={hasFilters}
      onReset={() => {
        setSearchText('');
        listRef.current?.scrollToItem(0);
      }}
    >
      <Box sx={{ flexGrow: 1, overflow: 'hidden', px: 1, py: 2 }}>
        <List
          ref={listRef}
          height={window.innerHeight - headerHeight - footerHeight - 164}
          width="100%"
          itemCount={filteredUsers.length}
          itemSize={() => CARD_HEIGHT}
        >
          {renderRow}
        </List>
      </Box>

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
    </PageWithStickyFilters>
  );
}
