// src/hooks/useStickyTableQuerySync.ts
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';

const K_SORT = 'sort';
const K_FILTERS = 'filters';
const K_VIEW = 'view';

function enc(obj: unknown): string {
  return encodeURIComponent(JSON.stringify(obj));
}
function dec<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return fallback;
  }
}

// 👇 add generic TView (defaults to string for backward-compat)
type Args<TView extends string = string> = {
  sorting: SortingState;
  setSorting: (s: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (f: ColumnFiltersState) => void;
  viewMode?: TView;
  setViewMode?: (v: TView) => void;
};

export function useStickyTableQuerySync<TView extends string = string>({
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  viewMode,
  setViewMode,
}: Args<TView>) {
  const [params, setParams] = useSearchParams();
  const didInit = useRef(false);

  // hydrate once
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const initSorting = dec<SortingState>(params.get(K_SORT), []);
    const initFilters = dec<ColumnFiltersState>(params.get(K_FILTERS), []);
    const initView = params.get(K_VIEW);

    if (initSorting.length) setSorting(initSorting);
    if (initFilters.length) setColumnFilters(initFilters);
    if (initView && setViewMode) setViewMode(initView as TView);
  }, [params, setColumnFilters, setSorting, setViewMode]);

  const currentStr = useMemo(() => params.toString(), [params]);

  // push updates
  useEffect(() => {
    const next = new URLSearchParams(params);

    if (sorting.length) next.set(K_SORT, enc(sorting));
    else next.delete(K_SORT);

    if (columnFilters.length) next.set(K_FILTERS, enc(columnFilters));
    else next.delete(K_FILTERS);

    if (setViewMode) {
      if (viewMode) next.set(K_VIEW, viewMode);
      else next.delete(K_VIEW);
    }

    const nextStr = next.toString();
    if (nextStr !== currentStr) setParams(next, { replace: true });
  }, [
    sorting,
    columnFilters,
    viewMode,
    setParams,
    params,
    currentStr,
    setViewMode,
  ]);
}
