// src/pages/ProductsPage/ProductsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Divider, Snackbar, Alert } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

import type { IProduct } from '@common/types';
import { db } from '../../firebase';
import StickyTable from '../../components/StickyTable';
import { defineProductColumns } from './Columns';
import LoadingProgress from '../../components/LoadingProgress';
import NotFound from '../../components/NotFound';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';

// URL sync hooks
import { useStickyTableQuerySync } from '../../hooks/useStickyTableQuerySync';
import { useProductsQuerySync } from '../../hooks/useProductsQuerySync';
import dayjs, { Dayjs } from 'dayjs';
// Categories for the Category column/filter
import { useCategories } from '../../hooks/useCategories';

export default function ProductsPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Page-level filters (optional; synced to URL)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [createdAfter, setCreatedAfter] = useState<Dayjs | null>(null);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(100000);

  // Load categories for the Category column (select filter)
  const { data: categories = [] } = useCategories();

  const { ref: sentinelRef, inView } = useInView();

  // Live Firestore list (debounced)
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order'));
    const debouncedSet = debounce(
      (items: IProduct[]) => setProducts(items),
      300,
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs: IProduct[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as IProduct),
        id: doc.id,
      }));
      debouncedSet(docs);
    });

    return () => {
      unsub();
      debouncedSet.cancel();
    };
  }, []);

  // Convert various createdAt shapes to Date
  const toJsDate = (val: unknown): Date | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof val === 'object' && 'seconds' in (val as any)) {
      const ts = val as { seconds: number; nanoseconds?: number };
      const d = new Date(
        ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1_000_000),
      );
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };

  // Apply page-level filters (search/category/date/price)
  const filteredProducts = useMemo(() => {
    const caDate = createdAfter?.toDate() ?? undefined;

    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategoryId || p.categoryId === selectedCategoryId;

      const createdAt = toJsDate(
        (p as any)?.createdAt ?? (p as any)?.metadata?.createdAt,
      );
      const matchesCreatedAfter = !caDate || !createdAt || createdAt >= caDate;

      const price = typeof p.price === 'number' ? p.price : 0;
      const matchesPrice = price >= minPrice && price <= maxPrice;

      return (
        matchesSearch && matchesCategory && matchesCreatedAfter && matchesPrice
      );
    });
  }, [
    products,
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
  ]);

  // Infinite scroll (after filtering)
  useEffect(() => {
    if (inView && visibleCount < filteredProducts.length) {
      const t = setTimeout(() => setVisibleCount((prev) => prev + 10), 300);
      return () => clearTimeout(t);
    }
  }, [inView, visibleCount, filteredProducts.length]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  // ✅ Pass categories, not navigate
  const columns = useMemo(
    () => defineProductColumns(categories, setSnackbarOpen),
    [categories],
  );

  // Sync sorting/filters to query string (and hydrate on load)
  useStickyTableQuerySync({
    sorting,
    setSorting: (s) => setSorting(s),
    columnFilters,
    setColumnFilters: (f) => setColumnFilters(f),
  });

  // Sync page filters to query string (and hydrate on load)
  useProductsQuerySync({
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    setSearchTerm,
    setSelectedCategoryId,
    setCreatedAfter,
    setMinPrice,
    setMaxPrice,
  });

  return (
    <Box px={2} py={1}>
      <Divider sx={{ mb: 2 }} />

      {filteredProducts.length === 0 ? (
        <NotFound message="No products found." />
      ) : (
        <StickyTable<IProduct>
          data={visibleProducts}
          columns={columns}
          sorting={sorting}
          onSortingChange={(updater) =>
            setSorting(
              typeof updater === 'function' ? updater(sorting) : updater,
            )
          }
          columnFilters={columnFilters}
          onColumnFiltersChange={(updater) =>
            setColumnFilters(
              typeof updater === 'function' ? updater(columnFilters) : updater,
            )
          }
          groupById="categoryId"
          enablePagination
          enableSorting
          enableColumnFilters
        />
      )}

      <Box ref={sentinelRef} display="flex" justifyContent="center" py={3}>
        {visibleCount < filteredProducts.length && <LoadingProgress />}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Product added to cart
        </Alert>
      </Snackbar>
    </Box>
  );
}
