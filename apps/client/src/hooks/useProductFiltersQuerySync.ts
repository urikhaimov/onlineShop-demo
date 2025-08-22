import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useProductStore } from '../stores/useProductStore';
import type { ViewMode } from '../components/TopActionBar'; // ← use SAME type

// Include view in the query keys
export const PRODUCT_FILTER_PARAM_KEYS = [
  'p_q',
  'p_cat',
  'p_priceMin',
  'p_priceMax',
  'p_stockMin',
  'p_stockMax',
  'p_from',
  'p_to',
  'p_view', // ← added
] as const;

export const clearProductFilterParams = (params: URLSearchParams) => {
  PRODUCT_FILTER_PARAM_KEYS.forEach((k) => params.delete(k));
};

const toNum = (v: string | null): number | null => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDayjsOrNull = (v: string | null): Dayjs | null => {
  if (!v) return null;
  const d = dayjs(v, 'YYYY-MM-DD', true);
  return d.isValid() ? d : null;
};

export function useProductFiltersQuerySync(
  viewMode?: ViewMode,
  setViewMode?: (v: ViewMode) => void,
) {
  const [params, setParams] = useSearchParams();

  const {
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    setSearchTerm,
    setSelectedCategoryId,
    setUpdatedFrom,
    setUpdatedTo,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
  } = useProductStore();

  // URL -> store (once)
  useEffect(() => {
    const q = params.get('p_q') ?? '';
    const cat = params.get('p_cat') ?? '';
    const pMin = toNum(params.get('p_priceMin'));
    const pMax = toNum(params.get('p_priceMax'));
    const sMin = toNum(params.get('p_stockMin'));
    const sMax = toNum(params.get('p_stockMax'));
    const from = toDayjsOrNull(params.get('p_from'));
    const to = toDayjsOrNull(params.get('p_to'));

    if (q !== searchTerm) setSearchTerm(q);
    if (cat !== selectedCategoryId) setSelectedCategoryId(cat);
    if (pMin !== null && pMin !== minPrice) setMinPrice(pMin);
    if (pMax !== null && pMax !== maxPrice) setMaxPrice(pMax);
    if (sMin !== null && sMin !== minStock) setMinStock(sMin);
    if (sMax !== null && sMax !== maxStock) setMaxStock(sMax);

    if (from && (!updatedFrom || !from.isSame(updatedFrom, 'day'))) {
      setUpdatedFrom(from);
    }
    if (to && (!updatedTo || !to.isSame(updatedTo, 'day'))) {
      setUpdatedTo(to);
    }

    // hydrate view mode
    const pv = params.get('p_view');
    if ((pv === 'table' || pv === 'cards') && setViewMode && pv !== viewMode) {
      setViewMode(pv);
    }
  }, []); // run once

  // store -> URL (also write view)
  useEffect(() => {
    const next = new URLSearchParams(params);

    const setOrDelete = (
      key: string,
      val: string | number | null | undefined,
    ) => {
      if (val === null || val === undefined || val === '') next.delete(key);
      else next.set(key, String(val));
    };

    setOrDelete('p_q', searchTerm);
    setOrDelete('p_cat', selectedCategoryId);
    setOrDelete('p_priceMin', minPrice);
    setOrDelete('p_priceMax', maxPrice);
    setOrDelete('p_stockMin', minStock);
    setOrDelete('p_stockMax', maxStock);

    const fmt = (d: Dayjs | null): string =>
      d && d.isValid() ? d.format('YYYY-MM-DD') : '';
    const fromStr = fmt(updatedFrom);
    const toStr = fmt(updatedTo);

    if (fromStr) next.set('p_from', fromStr);
    else next.delete('p_from');
    if (toStr) next.set('p_to', toStr);
    else next.delete('p_to');

    if (viewMode === 'table' || viewMode === 'cards') {
      next.set('p_view', viewMode);
    } else {
      next.delete('p_view');
    }

    if (params.toString() !== next.toString()) {
      setParams(next, { replace: true });
    }
  }, [
    params,
    setParams,
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    viewMode, // ← include viewMode
  ]);
}
