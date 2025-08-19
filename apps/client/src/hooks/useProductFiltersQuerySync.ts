import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useProductStore } from '../stores/useProductStore';

const PRICE_MIN = 0;
const PRICE_MAX = 100000;
const STOCK_MIN = 0;
const STOCK_MAX = 1000;

type ViewMode = 'table' | 'cards';

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

/**
 * Hydrates filters from the URL once, then keeps the URL in sync
 * whenever filters (or view mode) change.
 */
export function useProductFiltersQuerySync(
  view: ViewMode,
  setView: (v: ViewMode) => void,
) {
  const [searchParams, setSearchParams] = useSearchParams();
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

  // 1) Read from URL once (on mount)
  useEffect(() => {
    if (hydrated.current) return;

    const q = searchParams.get('q') ?? '';
    const cat = searchParams.get('cat') ?? '';
    const viewParam = searchParams.get('view') as ViewMode | null;

    const [pMin, pMax] = parseRange(
      searchParams.get('price'),
      PRICE_MIN,
      PRICE_MAX,
    );
    const [sMin, sMax] = parseRange(
      searchParams.get('stock'),
      STOCK_MIN,
      STOCK_MAX,
    );

    const upFrom = fromISO(searchParams.get('upFrom'));
    const upTo = fromISO(searchParams.get('upTo'));

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

  // 2) Write to URL whenever filters change
  useEffect(() => {
    if (!hydrated.current) return;

    const next = new URLSearchParams(searchParams);

    const setOrDel = (key: string, value?: string, isDefault?: boolean) => {
      if (!value || isDefault) next.delete(key);
      else next.set(key, value);
    };

    setOrDel('q', searchTerm?.trim(), !searchTerm);
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

    const current = searchParams.toString();
    const nextStr = next.toString();
    if (nextStr !== current) setSearchParams(next, { replace: true });
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
    searchParams,
    setSearchParams,
  ]);
}
