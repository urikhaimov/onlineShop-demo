// src/hooks/useOrderFiltersQuerySync.ts
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useOrderFilterStore,
  ORDER_TOTAL_MIN,
  ORDER_TOTAL_MAX,
} from '../stores/useOrderFilterStore';

type ViewMode = 'table' | 'cards';

export function useOrderFiltersQuerySync(
  viewMode: ViewMode,
  setViewMode: (v: ViewMode) => void,
) {
  const {
    searchTerm,
    status,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    setSearchTerm,
    setStatus,
    setDateFrom,
    setDateTo,
    setMinTotal,
    setMaxTotal,
  } = useOrderFilterStore();

  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const q = params.get('q') ?? '';
    const st = params.get('status') ?? '';
    const from = params.get('from');
    const to = params.get('to');
    const v = params.get('view');

    const tmin = params.get('tmin');
    const tmax = params.get('tmax');

    setSearchTerm(q);
    setStatus(st || '');
    setDateFrom(from || null);
    setDateTo(to || null);

    if (tmin !== null) {
      const n = Number(tmin);
      if (!Number.isNaN(n)) setMinTotal(n);
    }
    if (tmax !== null) {
      const n = Number(tmax);
      if (!Number.isNaN(n)) setMaxTotal(n);
    }

    if (v === 'table' || v === 'cards') setViewMode(v);
  }, []);

  // Push updates to URL (use if/else instead of ternaries)
  useEffect(() => {
    const next = new URLSearchParams(params);

    if (searchTerm) next.set('q', searchTerm);
    else next.delete('q');

    if (status) next.set('status', status);
    else next.delete('status');

    if (dateFrom) next.set('from', dateFrom);
    else next.delete('from');

    if (dateTo) next.set('to', dateTo);
    else next.delete('to');

    if (Number.isFinite(minTotal) && minTotal !== ORDER_TOTAL_MIN) {
      next.set('tmin', String(minTotal));
    } else {
      next.delete('tmin');
    }

    if (Number.isFinite(maxTotal) && maxTotal !== ORDER_TOTAL_MAX) {
      next.set('tmax', String(maxTotal));
    } else {
      next.delete('tmax');
    }

    next.set('view', viewMode);

    setParams(next, { replace: true });
  }, [
    searchTerm,
    status,
    dateFrom,
    dateTo,
    minTotal,
    maxTotal,
    viewMode,
    params,
    setParams,
  ]);
}
