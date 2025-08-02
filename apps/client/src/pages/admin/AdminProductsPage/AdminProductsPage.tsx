import React, { useEffect, useMemo, useState } from 'react';
import { Box, Snackbar, Alert, Divider } from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useProductMutations } from '../../../hooks/useProductMutations';
import { IProduct } from '@common/types';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import LoadingProgress from '../../../components/LoadingProgress';
import NotFound from '../../../components/NotFound';
import StickyTable from '../../../components/StickyTable';
import { defineProductColumns } from './Columns';
import { useNavigate } from 'react-router-dom';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { reorder } = useProductMutations();

  const sensors = useSensors(useSensor(PointerSensor));
  const { ref: sentinelRef, inView } = useInView();

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order'));
    const debouncedSet = debounce((items: IProduct[]) => {
      setProducts(items);
    }, 300);

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

  const visibleProducts = products.slice(0, visibleCount);

  useEffect(() => {
    if (inView && visibleCount < products.length) {
      const timeout = setTimeout(() => {
        setVisibleCount((prev) => prev + 10);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [inView, visibleCount, products.length]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleProducts.findIndex((p) => p.id === active.id);
    const newIndex = visibleProducts.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedVisible = arrayMove(visibleProducts, oldIndex, newIndex);
    const updated = [...products];

    reorderedVisible.forEach((product, idx) => {
      const globalIndex = updated.findIndex((p) => p.id === product.id);
      if (globalIndex !== -1) {
        updated.splice(globalIndex, 1);
        updated.splice(idx + products.indexOf(visibleProducts[0]), 0, product);
      }
    });

    const uniqueUpdated = Array.from(
      new Map(updated.map((p) => [p.id, p])).values(),
    );

    setProducts(uniqueUpdated);

    const orderList = uniqueUpdated.map((p, i) => ({ id: p.id, order: i }));
    const token = await auth.currentUser?.getIdToken();

    if (token) {
      try {
        await reorder.mutateAsync({ orderList, token });
        setSnackbarOpen(true);
      } catch (error) {
        console.error('❌ Reorder failed', error);
      }
    }
  };
  const navigate = useNavigate();
  const columns = useMemo(() => defineProductColumns(navigate), [navigate]);

  return (
    <Box px={2} py={1}>
      <Divider sx={{ mb: 2 }} />
      {products.length === 0 ? (
        <NotFound message="No products found." />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={visibleProducts.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <StickyTable
              data={visibleProducts}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
            />
          </SortableContext>
        </DndContext>
      )}

      <Box ref={sentinelRef} display="flex" justifyContent="center" py={3}>
        {visibleCount < products.length && <LoadingProgress />}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Product order updated
        </Alert>
      </Snackbar>
    </Box>
  );
}
