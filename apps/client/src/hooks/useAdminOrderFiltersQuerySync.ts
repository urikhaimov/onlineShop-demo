import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useAdminOrdersStore,
  type AdminOrderFilterState,
} from '../stores/useAdminOrdersStore';

export const ADMIN_ORDER_FILTER_PARAM_KEYS = [
  'f_email',
  'f_status',
  'f_totalMin',
  'f_totalMax',
  'f_priceMin',
  'f_priceMax',
  'f_inStock',
  'f_from',
  'f_to',
  'f_sort',
] as const;

export const clearAdminOrderFiltersInSearchParams = (
  params: URLSearchParams,
) => {
  ADMIN_ORDER_FILTER_PARAM_KEYS.forEach((k) => params.delete(k));
};

type AdminOrderFilters = AdminOrderFilterState;

const toNum = (v: string | null): number | null => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toBool = (v: string | null): boolean => v === '1' || v === 'true';

const toDateOrNull = (v: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

const toYMD = (d: Date | null | undefined): string | null =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

export function useAdminOrderFiltersQuerySync() {
  const [params, setParams] = useSearchParams();
  const { filters, updateFilter } = useAdminOrdersStore();

  // URL → store (once)
  useEffect(() => {
    const initial: AdminOrderFilters = {
      email: params.get('f_email') ?? '',
      status: (params.get('f_status') as AdminOrderFilters['status']) ?? 'all',
      minTotal: toNum(params.get('f_totalMin')),
      maxTotal: toNum(params.get('f_totalMax')),
      minPrice: toNum(params.get('f_priceMin')),
      maxPrice: toNum(params.get('f_priceMax')),
      inStockOnly: toBool(params.get('f_inStock')),
      startDate: toDateOrNull(params.get('f_from')),
      endDate: toDateOrNull(params.get('f_to')),
      sortDirection: params.get('f_sort') === 'asc' ? 'asc' : 'desc',
      page: filters.page, // keep existing pagination
      pageSize: filters.pageSize, // keep existing pagination
    };

    // set each key explicitly (typed) only if changed
    if (initial.email !== filters.email) updateFilter('email', initial.email);
    if (initial.status !== filters.status)
      updateFilter('status', initial.status);
    if (initial.minTotal !== filters.minTotal)
      updateFilter('minTotal', initial.minTotal);
    if (initial.maxTotal !== filters.maxTotal)
      updateFilter('maxTotal', initial.maxTotal);
    if (initial.minPrice !== filters.minPrice)
      updateFilter('minPrice', initial.minPrice);
    if (initial.maxPrice !== filters.maxPrice)
      updateFilter('maxPrice', initial.maxPrice);
    if (initial.inStockOnly !== filters.inStockOnly)
      updateFilter('inStockOnly', initial.inStockOnly);
    if (+initial.startDate! !== +filters.startDate!)
      updateFilter('startDate', initial.startDate);
    if (+initial.endDate! !== +filters.endDate!)
      updateFilter('endDate', initial.endDate);
    if (initial.sortDirection !== filters.sortDirection)
      updateFilter('sortDirection', initial.sortDirection);
    // intentionally run once on mount
    // eslint rule not referenced to avoid "rule not found" error
  }, []); // ← intentional

  // store → URL
  useEffect(() => {
    const next = new URLSearchParams(params);

    const setOrDelete = (key: string, val: unknown, def?: unknown) => {
      let out = '';
      if (typeof val === 'boolean') out = val ? '1' : '';
      else if (val instanceof Date) out = toYMD(val) ?? '';
      else if (val === null || val === undefined || val === '') out = '';
      else out = String(val);

      const defStr = def === undefined ? undefined : String(def);
      if (out && out !== defStr) next.set(key, out);
      else next.delete(key);
    };

    setOrDelete('f_email', filters.email, '');
    setOrDelete('f_status', filters.status, 'all');
    setOrDelete('f_totalMin', filters.minTotal);
    setOrDelete('f_totalMax', filters.maxTotal);
    setOrDelete('f_priceMin', filters.minPrice);
    setOrDelete('f_priceMax', filters.maxPrice);
    setOrDelete('f_inStock', filters.inStockOnly, false);
    setOrDelete('f_from', filters.startDate);
    setOrDelete('f_to', filters.endDate);
    setOrDelete('f_sort', filters.sortDirection ?? 'desc', 'desc');

    if (params.toString() !== next.toString()) {
      setParams(next, { replace: true });
    }
  }, [filters, params, setParams]);
}
