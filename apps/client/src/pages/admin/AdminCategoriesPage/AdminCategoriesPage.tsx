import React, { useReducer, useState, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import PageWithStickyFilters from '../../../layouts/PageWithStickyFilters';
import {
  useCategories,
  useAddCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../../hooks/useCategories';
import { categoryReducer, initialCategoryState } from './categoryReducer';
import { uiReducer, initialUIState } from './LocalUiReducer';
import AdminCategoriesFilters from './AdminCategoriesFilters';
import { headerHeight, footerHeight } from '../../../config/themeConfig';

export default function AdminCategoriesPage() {
  const [state, dispatch] = useReducer(categoryReducer, initialCategoryState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  const { newCategory, editingId, editName, errorMessage } = state;

  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [categories, searchText]);

  const hasFilters = searchText.trim().length > 0;

  const handleAdd = () => {
    if (!newCategory.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Name cannot be empty' });
      return;
    }

    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCategory.trim().toLowerCase(),
    );
    if (exists) {
      dispatch({ type: 'SET_ERROR', payload: 'Category already exists' });
      return;
    }

    addCategory.mutate(newCategory.trim(), {
      onSuccess: () => dispatch({ type: 'RESET_NEW' }),
    });
  };

  const handleEdit = (id: string, name: string) => {
    dispatch({ type: 'SET_EDIT', payload: { id, name } });
  };

  const handleSave = () => {
    if (!editName.trim()) return;

    updateCategory.mutate(
      { id: editingId!, name: editName.trim() },
      {
        onSuccess: () => {
          dispatch({ type: 'CLEAR_EDIT' });
        },
      },
    );
  };

  return (
    <PageWithStickyFilters
      title="Manage Categories"
      sidebar={
        <AdminCategoriesFilters
          searchText={searchText}
          setSearchText={(val) => {
            setSearchText(val);
          }}
          total={filteredCategories.length}
        />
      }
      mobileOpen={uiState.mobileDrawerOpen}
      onMobileOpen={() => uiDispatch({ type: 'OPEN_MOBILE_DRAWER' })}
      onMobileClose={() => uiDispatch({ type: 'CLOSE_MOBILE_DRAWER' })}
      hasFilters={hasFilters}
      onReset={() => {
        setSearchText('');
      }}
    >
      <Box display="flex" gap={2} mb={3} px={1}>
        <TextField
          label="New Category"
          value={newCategory}
          onChange={(e) => {
            dispatch({ type: 'SET_NEW', payload: e.target.value });
            if (errorMessage) dispatch({ type: 'SET_ERROR', payload: '' });
          }}
          error={!!errorMessage}
          helperText={errorMessage}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      <Box
        sx={{
          height: `calc(100vh - ${headerHeight + footerHeight + 160}px)`,
          overflowY: 'auto',
          pr: 1,
          px: 1,
        }}
      >
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Admin Categories
        </Typography>

        <List dense>
          {filteredCategories.map((cat) => (
            <ListItem
              key={cat.id}
              secondaryAction={
                editingId === cat.id ? (
                  <>
                    <IconButton onClick={handleSave}>
                      <SaveIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => dispatch({ type: 'CLEAR_EDIT' })}
                    >
                      <CloseIcon />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton onClick={() => handleEdit(cat.id, cat.name)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => deleteCategory.mutate(cat.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                )
              }
            >
              {editingId === cat.id ? (
                <TextField
                  value={editName}
                  onChange={(e) =>
                    dispatch({ type: 'SET_EDIT_NAME', payload: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
              ) : (
                <ListItemText primary={cat.name} />
              )}
            </ListItem>
          ))}
        </List>
      </Box>
    </PageWithStickyFilters>
  );
}
