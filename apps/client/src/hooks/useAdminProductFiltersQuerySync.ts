import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useProductStore } from '../stores/useProductStore';

export const PRODUCT_FILTER_PARAM_KEYS = [
  'p_q',
  'p_cat',
  'p_pmin',
  'p_pmax',
  'p_smin',
  'p_smax',
  'p_from',
  'p_to',
] as const;

export const clearAdminProductFiltersInSearchParams = (
  params: URLSearchParams,
) => {
  PRODUCT_FILTER_PARAM_KEYS.forEach((k) => params.delete(k));
};

const toNum = (v: string | null): number | null => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDay = (v: string | null): Dayjs | null => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d : null;
};

export function useAdminProductFiltersQuerySync() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);

  const {
    // state
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    updatedFrom,
    updatedTo,
    // setters
    setSearchTerm,
    setSelectedCategoryId,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
    setUpdatedFrom,
    setUpdatedTo,
  } = useProductStore();

  /** URL → store (run once) */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const initial = {
      q: params.get('p_q') ?? '',
      cat: params.get('p_cat') ?? '',
      pmin: toNum(params.get('p_pmin')),
      pmax: toNum(params.get('p_pmax')),
      smin: toNum(params.get('p_smin')),
      smax: toNum(params.get('p_smax')),
      from: toDay(params.get('p_from')),
      to: toDay(params.get('p_to')),
    };

    if (initial.q !== searchTerm) setSearchTerm(initial.q);
    if (initial.cat !== selectedCategoryId) setSelectedCategoryId(initial.cat);
    if (initial.pmin !== null && initial.pmin !== minPrice)
      setMinPrice(initial.pmin);
    if (initial.pmax !== null && initial.pmax !== maxPrice)
      setMaxPrice(initial.pmax);
    if (initial.smin !== null && initial.smin !== minStock)
      setMinStock(initial.smin);
    if (initial.smax !== null && initial.smax !== maxStock)
      setMaxStock(initial.smax);

    if (
      initial.from &&
      (!updatedFrom || !updatedFrom.isSame(initial.from, 'day'))
    ) {
      setUpdatedFrom(initial.from);
    }
    if (initial.to && (!updatedTo || !updatedTo.isSame(initial.to, 'day'))) {
      setUpdatedTo(initial.to);
    }
    // run once on mount
  }, []); // intentional

  /** store → URL (guarded) */
  useEffect(() => {
    if (!hydrated.current) return;

    const next = new URLSearchParams(params);

    const setOrDelete = (key: string, val: unknown) => {
      const s = String(val ?? '');
      if (!s) next.delete(key);
      else next.set(key, s);
    };

    setOrDelete('p_q', searchTerm);
    setOrDelete('p_cat', selectedCategoryId);

    if (minPrice === null) next.delete('p_pmin');
    else next.set('p_pmin', String(minPrice));

    if (maxPrice === null) next.delete('p_pmax');
    else next.set('p_pmax', String(maxPrice));

    if (minStock === null) next.delete('p_smin');
    else next.set('p_smin', String(minStock));

    if (maxStock === null) next.delete('p_smax');
    else next.set('p_smax', String(maxStock));

    const fmt = (d: Dayjs | null): string =>
      d && d.isValid() ? d.format('YYYY-MM-DD') : '';

    const fromStr = fmt(updatedFrom);
    const toStr = fmt(updatedTo);

    if (fromStr) next.set('p_from', fromStr);
    else next.delete('p_from');

    if (toStr) next.set('p_to', toStr);
    else next.delete('p_to');

    const curr = params.toString();
    const nxt = next.toString();
    if (curr !== nxt) setParams(next, { replace: true });
  }, [
    params,
    setParams,
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    updatedFrom,
    updatedTo,
  ]);
}
