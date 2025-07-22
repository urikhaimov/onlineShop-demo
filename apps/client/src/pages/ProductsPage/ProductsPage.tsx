import { Alert, Box, Snackbar, Typography } from '@mui/material';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

import { fetchAllProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';

import PageWithStickyFilters from '../../layouts/PageWithStickyFilters';
import UserProductFilters from './UserProductFilters';
import ProductCardContainer from './ProductCardContainer';
import LoadingProgress from '../../components/LoadingProgress';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import { initialState, reducer as filterReducer } from './LocalReducer';
import { IProduct } from '@common/types';
import { initialUIState, uiReducer } from './LocalUiReducer';
import { useAuth } from '../../hooks/useAuth';

export default function ProductsPage() {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [renderCount, setRenderCount] = useState(20);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetchAllProducts();
        if (!Array.isArray(res.data)) {
          console.error('❌ Invalid product response:', res.data);
          setProducts([]);
          return;
        }
        setProducts(res.data);
      } catch (err) {
        console.error('❌ Failed to load products:', err);
      } finally {
        uiDispatch({ type: 'setLoading', payload: false });
      }
    };

    void loadProducts();
  }, [user]);

  const isDate = (val: unknown): val is Date => val instanceof Date;

  const filteredProducts = products.filter((p) => {
    const txt = state.search.toLowerCase();
    const inText =
      p.name.toLowerCase().includes(txt) ||
      (p.description?.toLowerCase().includes(txt) ?? false);

    const inCat =
      !state.selectedCategoryId ||
      p.categoryId.toString() === state.selectedCategoryId;

    const inDate =
      !state.createdAfter ||
      (() => {
        if (!p.createdAt) return false;
        let productDate: Date | null = null;
        if (typeof p.createdAt === 'string')
          productDate = new Date(p.createdAt);
        else if (typeof (p.createdAt as any)?.toDate === 'function')
          productDate = (p.createdAt as any).toDate();
        else if (isDate(p.createdAt)) productDate = p.createdAt;
        if (!productDate) return false;
        return productDate.getTime() >= state.createdAfter!.toDate().getTime();
      })();

    const inStock = !state.inStockOnly || p.stock > 0;

    const inPriceRange =
      (state.minPrice === null || p.price >= state.minPrice) &&
      (state.maxPrice === null || p.price <= state.maxPrice);

    return inText && inCat && inDate && inStock && inPriceRange;
  });

  const loadMore = () => {
    if (renderCount < filteredProducts.length) {
      setRenderCount((prev) => prev + 20);
    }
  };

  const onItemsRendered = ({
    visibleStopIndex,
  }: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    if (visibleStopIndex >= renderCount - 5) {
      loadMore();
    }
  };

  const hasFilters =
    !!state.search ||
    !!state.selectedCategoryId ||
    !!state.createdAfter ||
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.inStockOnly;

  if (uiState.loading) return <LoadingProgress />;

  return (
    <PageWithStickyFilters
      title="Products"
      sidebar={
        <UserProductFilters
          state={state}
          dispatch={dispatch}
          categories={categories}
        />
      }
      onMobileOpen={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: true })
      } // 👈 Required
      onMobileClose={() =>
        uiDispatch({ type: 'setMobileDrawerOpen', payload: false })
      } // 👈 Required
      hasFilters={hasFilters}
      onReset={() => dispatch({ type: 'RESET_FILTERS' })}
      mobileOpen={uiState.mobileDrawerOpen}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      ></Box>

      {filteredProducts.length === 0 ? (
        <Typography>No products found.</Typography>
      ) : (
        <List
          height={window.innerHeight - (headerHeight + footerHeight + 140)}
          itemCount={Math.min(renderCount, filteredProducts.length)}
          itemSize={130}
          width="100%"
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => {
            const p = filteredProducts[index];
            return (
              <Box key={p.id} style={style} px={1}>
                <ProductCardContainer
                  product={p}
                  disabled={false}
                  onAddToCart={() =>
                    uiDispatch({ type: 'setSnackbarOpen', payload: true })
                  }
                  onConfirmDelete={() => {
                    // TODO: Implement delete confirmation logic
                  }}
                />
              </Box>
            );
          }}
        </List>
      )}

      <Snackbar
        open={uiState.snackbarOpen}
        autoHideDuration={3000}
        onClose={() => uiDispatch({ type: 'setSnackbarOpen', payload: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Product added to cart
        </Alert>
      </Snackbar>
    </PageWithStickyFilters>
  );
}
