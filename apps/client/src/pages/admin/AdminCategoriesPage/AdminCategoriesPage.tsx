// src/pages/admin/AdminCategoriesPage.tsx
import React, { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useCategories } from '../../../hooks/useCategories';
import StickyTable from '../../../components/StickyTable';
import { defineCategoryColumns } from './Columns';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
export default function AdminCategoriesPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { data: categories = [] } = useCategories();
  const navigate = useNavigate();

  const columns = useMemo(() => defineCategoryColumns(navigate), [navigate]);

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={2} py={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" fontWeight="bold">
            Manage Categories
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/admin/categories/add')}
          >
            Add Category
          </Button>
        </Box>

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
    </PageLayout>
  );
}
