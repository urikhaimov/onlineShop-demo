// src/hooks/useProductFiltersQuerySync.ts
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useProductStore } from '../stores/useProductStore';

type ViewMode = 'table' | 'cards';

const PRICE_MIN = 0;
const PRICE_MAX = 100000;
const STOCK_MIN = 0;
const STOCK_MAX = 1000;

const toISO = (d: Dayjs | null | undefined) =>
  d ? d.startOf('day').format('YYYY-MM-DD') : '';

const fromISO = (s?: string | null): Dayjs | null => {
  if (!s) return null;
  const d = dayjs(s, 'YYYY-MM-DD', true);
  return d.isValid() ? d : null;
};

const parseRange = (
  s: string | null,
  minDefault: number,
  maxDefault: number,
): readonly [number, number] => {
  if (!s) return [minDefault, maxDefault] as const;
  const [a, b] = s.split('-');
  const min = Number(a);
  const max = Number(b);
  if (Number.isFinite(min) && Number.isFinite(max)) return [min, max] as const;
  return [minDefault, maxDefault] as const;
};

const formatRange = (min: number, max: number) => `${min}-${max}`;

export function useProductFiltersQuerySync(
  view: ViewMode,
  setView: (v: ViewMode) => void,
) {
  const [params, setParams] = useSearchParams();
  const paramString = params.toString(); // stable dep vs object identity
  const hydrated = useRef(false);

  const {
    // state
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    // setters
    setSearchTerm,
    setSelectedCategoryId,
    setUpdatedFrom,
    setUpdatedTo,
    setMinPrice,
    setMaxPrice,
    setMinStock,
    setMaxStock,
  } = useProductStore();

  // 1) Hydrate from URL once
  useEffect(() => {
    if (hydrated.current) return;

    const q = params.get('q') ?? '';
    const cat = params.get('cat') ?? '';
    const [pMin, pMax] = parseRange(params.get('price'), PRICE_MIN, PRICE_MAX);
    const [sMin, sMax] = parseRange(params.get('stock'), STOCK_MIN, STOCK_MAX);
    const upFrom = fromISO(params.get('upFrom'));
    const upTo = fromISO(params.get('upTo'));
    const viewParam = params.get('view') as ViewMode | null;

    setSearchTerm(q);
    setSelectedCategoryId(cat);
    setUpdatedFrom(upFrom);
    setUpdatedTo(upTo);
    setMinPrice(pMin);
    setMaxPrice(pMax);
    setMinStock(sMin);
    setMaxStock(sMax);
    if (viewParam === 'table' || viewParam === 'cards') setView(viewParam);

    hydrated.current = true;
  }, []);

  // 2) Push current filters to URL when they change (only if different)
  useEffect(() => {
    if (!hydrated.current) return;

    const next = new URLSearchParams(paramString);

    const setOrDel = (key: string, value?: string, isDefault?: boolean) => {
      if (!value || isDefault) next.delete(key);
      else next.set(key, value);
    };

    setOrDel('q', (searchTerm ?? '').trim(), !searchTerm);
    setOrDel('cat', selectedCategoryId, !selectedCategoryId);

    const upFromStr = toISO(updatedFrom);
    const upToStr = toISO(updatedTo);
    setOrDel('upFrom', upFromStr);
    setOrDel('upTo', upToStr);

    const priceStr = formatRange(minPrice, maxPrice);
    const stockStr = formatRange(minStock, maxStock);
    setOrDel(
      'price',
      priceStr,
      minPrice === PRICE_MIN && maxPrice === PRICE_MAX,
    );
    setOrDel(
      'stock',
      stockStr,
      minStock === STOCK_MIN && maxStock === STOCK_MAX,
    );

    setOrDel('view', view);

    const nextStr = next.toString();
    if (nextStr !== paramString) {
      setParams(next, { replace: true }); // only write when changed
    }
  }, [
    searchTerm,
    selectedCategoryId,
    updatedFrom,
    updatedTo,
    minPrice,
    maxPrice,
    minStock,
    maxStock,
    view,
    paramString, // string, not the params object
    setParams,
  ]);
}
