import React, { useMemo, useReducer, useState } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { SortingState, ColumnFiltersState } from '@tanstack/react-table';

import {
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '../../../hooks/useCategories';
import { categoryReducer, initialCategoryState } from './categoryReducer';
import { initialUIState, uiReducer } from './LocalUiReducer';
import StickyTable from '../../../components/StickyTable';
import { defineColumns } from '../../../components/StickyTable/defineColumns';

export type Category = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  order?: number;
};

export default function AdminCategoriesPage() {
  const [state, dispatch] = useReducer(categoryReducer, initialCategoryState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  const { editingId, editName } = state;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: categories = [] } = useCategories();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  const handleEdit = (id: string, name: string) => {
    dispatch({ type: 'SET_EDIT', payload: { id, name } });
  };

  const handleSave = () => {
    if (!editName.trim()) return;
    updateCategory.mutate(
      { id: editingId!, name: editName.trim() },
      {
        onSuccess: () => dispatch({ type: 'CLEAR_EDIT' }),
      },
    );
  };

  const columns = useMemo(
    () =>
      defineColumns<Category>()([
        {
          header: 'Image',
          accessorKey: 'imageUrl',
          cell: ({ getValue }) => {
            const url = getValue() as string;
            return url ? (
              <img
                src={url}
                alt="category"
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
            ) : (
              'No image'
            );
          },
          enableSorting: false,
          enableColumnFilter: false,
        },
        {
          header: 'Order',
          accessorKey: 'order',
          cell: ({ getValue }) => getValue() ?? '—',
          enableSorting: true,
          enableColumnFilter: false,
        },
        {
          header: 'Name',
          accessorKey: 'name',
          cell: ({ row }) =>
            editingId === row.original.id ? (
              <TextField
                value={editName}
                onChange={(e) =>
                  dispatch({ type: 'SET_EDIT_NAME', payload: e.target.value })
                }
                size="small"
                fullWidth
              />
            ) : (
              row.original.name
            ),
          enableSorting: true,
          enableColumnFilter: true,
          meta: {
            filterType: 'text', // 👈 REQUIRED!
          },
        },
        {
          header: 'Description',
          accessorKey: 'description',
          cell: ({ getValue }) => {
            const value = getValue();
            return value === null
              ? 'null'
              : value === undefined
                ? 'undefined'
                : value;
          },
          enableSorting: true,
          enableColumnFilter: false,
        },
        {
          header: 'Actions',
          id: 'actions',
          cell: ({ row }) =>
            editingId === row.original.id ? (
              <>
                <IconButton onClick={handleSave} size="small">
                  <SaveIcon />
                </IconButton>
                <IconButton
                  onClick={() => dispatch({ type: 'CLEAR_EDIT' })}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  onClick={() => handleEdit(row.original.id, row.original.name)}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => deleteCategory.mutate(row.original.id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </>
            ),
          enableSorting: false,
          enableColumnFilter: false,
        },
      ]),
    [editingId, editName, deleteCategory],
  );

  return (
    <Box px={2} py={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Manage Categories
      </Typography>

      <StickyTable
        columns={columns}
        data={categories}
        stickyColumnIndex={0}
        enablePagination
        rowsPerPage={8}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        enableSorting
        enableColumnFilters
      />
    </Box>
  );
}
