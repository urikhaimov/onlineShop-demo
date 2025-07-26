import { useMemo } from 'react';
import { IProduct } from '@common/types';
import { State as FilterState } from '../pages/ProductsPage/LocalReducer';

type TimestampLike = string | Date | { toDate: () => Date } | null | undefined;

const isDate = (val: unknown): val is Date => val instanceof Date;

const parseProductDate = (createdAt: TimestampLike): Date | null => {
  if (!createdAt) return null;
  if (typeof createdAt === 'string') return new Date(createdAt);
  if (isDate(createdAt)) return createdAt;
  if (
    typeof createdAt === 'object' &&
    typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (createdAt as { toDate: () => Date }).toDate();
  }
  return null;
};

export const useFilteredProducts = (
  products: IProduct[],
  state: FilterState,
): IProduct[] => {
  return useMemo(() => {
    const txt = state.search.toLowerCase();

    return products.filter((p) => {
      const inText =
        p.name.toLowerCase().includes(txt) ||
        (p.description?.toLowerCase().includes(txt) ?? false);

      const inCat =
        !state.selectedCategoryId ||
        p.categoryId.toString() === state.selectedCategoryId;

      const inDate = !state.createdAfter
        ? true
        : (() => {
            const productDate = parseProductDate(p.createdAt);
            const afterDate = state.createdAfter?.toDate?.();
            return productDate && afterDate
              ? productDate.getTime() >= afterDate.getTime()
              : false;
          })();

      const inStock = !state.inStockOnly || p.stock > 0;

      const inPriceRange =
        (state.minPrice === null || p.price >= state.minPrice) &&
        (state.maxPrice === null || p.price <= state.maxPrice);

      return inText && inCat && inDate && inStock && inPriceRange;
    });
  }, [products, state]);
};
