import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useProductStore } from '../stores/useProductStore';

export const ADMIN_PRODUCT_FILTER_PARAM_KEYS = [
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
  ADMIN_PRODUCT_FILTER_PARAM_KEYS.forEach((k) => params.delete(k));
};

const toNum = (v: string | null): number | null => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDayjs = (v: string | null): Dayjs | null => (v ? dayjs(v) : null);
const toYMD = (d: Dayjs | null | undefined): string | null =>
  d ? d.format('YYYY-MM-DD') : null;

export function useAdminProductFiltersQuerySync() {
  const [params, setParams] = useSearchParams();
  const {
    searchTerm,
    setSearchTerm,
    selectedCategoryId,
    setSelectedCategoryId,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    minStock,
    maxStock,
    setMinStock,
    setMaxStock,
    updatedFrom,
    updatedTo,
    setUpdatedFrom,
    setUpdatedTo,
  } = useProductStore();

  // URL → store (once on mount)
  useEffect(() => {
    const q = params.get('p_q') ?? '';
    const cat = params.get('p_cat') ?? '';
    const pmin = toNum(params.get('p_pmin'));
    const pmax = toNum(params.get('p_pmax'));
    const smin = toNum(params.get('p_smin'));
    const smax = toNum(params.get('p_smax'));
    const from = toDayjs(params.get('p_from'));
    const to = toDayjs(params.get('p_to'));

    if (q !== searchTerm) setSearchTerm(q);
    if (cat !== selectedCategoryId) setSelectedCategoryId(cat);
    if ((pmin ?? 0) !== minPrice) setMinPrice(pmin ?? 0);
    if ((pmax ?? 100_000) !== maxPrice) setMaxPrice(pmax ?? 100_000);
    if ((smin ?? 0) !== minStock) setMinStock(smin ?? 0);
    if ((smax ?? 1_000) !== maxStock) setMaxStock(smax ?? 1_000);
    if ((from?.valueOf() ?? null) !== (updatedFrom?.valueOf() ?? null))
      setUpdatedFrom(from);
    if ((to?.valueOf() ?? null) !== (updatedTo?.valueOf() ?? null))
      setUpdatedTo(to);
  }, []);

  // store → URL (replace to avoid history spam)
  useEffect(() => {
    const next = new URLSearchParams(params);

    const setOrDelete = (key: string, val: unknown) => {
      let out = '';
      if (val === null) out = '';
      else if (typeof val === 'string') out = val;
      else if (typeof val === 'number') out = String(val);
      else if (dayjs.isDayjs(val)) out = toYMD(val as Dayjs) ?? '';
      if (out) next.set(key, out);
      else next.delete(key);
    };

    setOrDelete('p_q', searchTerm || '');
    setOrDelete('p_cat', selectedCategoryId || '');
    setOrDelete('p_pmin', minPrice);
    setOrDelete('p_pmax', maxPrice);
    setOrDelete('p_smin', minStock);
    setOrDelete('p_smax', maxStock);
    setOrDelete('p_from', updatedFrom);
    setOrDelete('p_to', updatedTo);

    if (params.toString() !== next.toString())
      setParams(next, { replace: true });
  }, [
    searchTerm,
    selectedCategoryId,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    updatedFrom,
    updatedTo,
    params,
    setParams,
  ]);
}
