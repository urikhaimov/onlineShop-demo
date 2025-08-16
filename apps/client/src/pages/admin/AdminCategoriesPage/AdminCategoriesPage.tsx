// src/pages/admin/AdminCategoriesPage.tsx
import React, { useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../../hooks/useCategories';
import StickyTable from '../../../components/StickyTable';
import { defineCategoryColumns } from './Columns';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useCategoryTableStore } from '../../../stores/useCategoryTableStore';
import type { TCategory as Category } from '@common/types';

// ✅ URL sync for table sorting + column filters
import { useStickyTableQuerySync } from '../../../hooks/useStickyTableQuerySync';

export default function AdminCategoriesPage() {
  const { sorting, setSorting, columnFilters, setColumnFilters } =
    useCategoryTableStore();

  const { data: categories = [] } = useCategories();
  const navigate = useNavigate();

  const columns = useMemo(() => defineCategoryColumns(navigate), [navigate]);

  // 🔗 Keep sorting + columnFilters in the query string (hydrate on load too)
  useStickyTableQuerySync({
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    // viewMode not used here, so omit
  });

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box px={5} py={4}>
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

        <StickyTable<Category>
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
