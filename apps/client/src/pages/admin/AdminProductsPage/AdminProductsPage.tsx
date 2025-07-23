import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Box,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
import { VariableSizeList } from 'react-window';
import { debounce } from 'lodash';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db } from '../../../firebase';
import { useAllCategories } from '../../../hooks/useAllCategories';
import { useProductMutations } from '../../../hooks/useProductMutations';
import PageWithStickyFilters from '../../../layouts/PageWithStickyFilters';
import LoadingProgress from '../../../components/LoadingProgress';
import SortableProductCard from './SortableProductCard';
import AdminProductFilters from './AdminProductFilters';
import { initialState, reducer } from './LocalReducer';
import { uiReducer, initialUIState } from './LocalUiReducer';
import { IProduct } from '@common/types';
import { headerHeight, footerHeight } from '../../../config/themeConfig';

export default function AdminProductsPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: categories = [] } = useAllCategories();
  const { reorder } = useProductMutations();
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor));
  const { ref: sentinelRef, inView } = useInView();

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order'));

    const debouncedSetProducts = debounce((products: IProduct[]) => {
      dispatch({ type: 'SET_PRODUCTS_SORTED', payload: products });
    }, 300);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products: IProduct[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as IProduct),
        id: doc.id,
      }));

      debouncedSetProducts(products);
    });

    return () => {
      unsubscribe();
      debouncedSetProducts.cancel();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const term = (state.searchTerm || '').toLowerCase();
    return state.products.filter((p) => {
      if (!p || typeof p !== 'object' || !p.name) return false;

      const matchesText =
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);

      const matchesCategory =
        !state.selectedCategoryId || p.categoryId === state.selectedCategoryId;

      let createdAtDate: Date | null = null;
      if (p.createdAt) {
        createdAtDate =
          typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt;
      }

      const matchesDate =
        !state.createdAfter ||
        (createdAtDate &&
          state.createdAfter &&
          createdAtDate.getTime() >= state.createdAfter.toDate().getTime());

      return matchesText && matchesCategory && matchesDate;
    });
  }, [
    state.products,
    state.searchTerm,
    state.selectedCategoryId,
    state.createdAfter,
  ]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  useEffect(() => {
    if (inView && visibleCount < filteredProducts.length) {
      const timeout = setTimeout(() => {
        setVisibleCount((prev) => prev + 10);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [inView, visibleCount, filteredProducts.length]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleProducts.findIndex((p) => p.id === active.id);
    const newIndex = visibleProducts.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedVisible = arrayMove(visibleProducts, oldIndex, newIndex);
    const updatedProducts = [...state.products];

    reorderedVisible.forEach((product, idx) => {
      const globalIndex = updatedProducts.findIndex((p) => p.id === product.id);
      if (globalIndex !== -1) {
        updatedProducts.splice(globalIndex, 1);
        updatedProducts.splice(
          idx + state.products.indexOf(visibleProducts[0]),
          0,
          product,
        );
      }
    });

    const uniqueUpdated = Array.from(
      new Map(updatedProducts.map((p) => [p.id, p])).values(),
    );

    dispatch({ type: 'SET_PRODUCTS', payload: uniqueUpdated });

    const orderList = uniqueUpdated.map((p, i) => ({ id: p.id, order: i }));
    const token = await auth.currentUser?.getIdToken();

    if (token) {
      dispatch({ type: 'SET_REORDER_PENDING', payload: true });
      try {
        await reorder.mutateAsync({ orderList, token });
        setSnackbarOpen(true);
      } catch (error) {
        console.error('❌ Reorder failed', error);
      } finally {
        dispatch({ type: 'SET_REORDER_PENDING', payload: false });
      }
    }
  };

  const hasFilters =
    !!state.searchTerm || !!state.createdAfter || !!state.selectedCategoryId;

  return (
    <PageWithStickyFilters
      title="Admin Products"
      sidebar={
        <AdminProductFilters
          state={state}
          dispatch={dispatch}
          categories={categories}
        />
      }
      onMobileOpen={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: true })
      }
      onMobileClose={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: false })
      }
      mobileOpen={uiState.mobileDrawerOpen}
      hasFilters={hasFilters}
      onReset={() => dispatch({ type: 'RESET_FILTERS' })}
    >
      <Divider sx={{ mb: 2 }} />

      {state.loading ? (
        <LoadingProgress />
      ) : (
        <Box
          sx={{
            px: 1,
            pb: 3,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={visibleProducts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <VariableSizeList
                height={window.innerHeight - headerHeight - footerHeight - 164}
                width="100%"
                itemCount={visibleProducts.length}
                itemSize={() => (isMobile ? 300 : 120)}
                overscanCount={4}
                style={{ overflowX: 'hidden' }}
              >
                {({ index, style }) => {
                  const product = visibleProducts[index];
                  return (
                    <div key={product.id} style={style}>
                      <Box
                        mb={2}
                        sx={{ opacity: state.reorderPending ? 0.4 : 1 }}
                      >
                        <SortableProductCard
                          product={product}
                          disabled={state.reorderPending}
                          onConfirmDelete={(id) =>
                            dispatch({ type: 'REMOVE_PRODUCT', payload: id })
                          }
                        />
                      </Box>
                    </div>
                  );
                }}
              </VariableSizeList>

              <Box
                ref={sentinelRef}
                display="flex"
                justifyContent="center"
                py={3}
              >
                {visibleCount < filteredProducts.length && (
                  <CircularProgress size={28} />
                )}
              </Box>
            </SortableContext>
          </DndContext>
        </Box>
      )}

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
    </PageWithStickyFilters>
  );
}
