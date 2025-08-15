import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';

/**
 * Wire this to your product store's fields.
 * All setters are expected to be stable (Zustand typically is).
 */
type Args = {
  // store values
  searchTerm: string;
  selectedCategoryId: string | null;
  createdAfter: Dayjs | null;
  minPrice: number;
  maxPrice: number;

  // setters
  setSearchTerm: (v: string) => void;
  setSelectedCategoryId: (v: string | null) => void;
  setCreatedAfter: (v: Dayjs | null) => void;
  setMinPrice: (v: number) => void;
  setMaxPrice: (v: number) => void;
};

const K_Q = 'q';
const K_CAT = 'cat';
const K_CA = 'ca';
const K_MIN = 'min';
const K_MAX = 'max';

export function useProductsQuerySync({
  searchTerm,
  selectedCategoryId,
  createdAfter,
  minPrice,
  maxPrice,
  setSearchTerm,
  setSelectedCategoryId,
  setCreatedAfter,
  setMinPrice,
  setMaxPrice,
}: Args) {
  const [params, setParams] = useSearchParams();
  const didInit = useRef(false);

  // 1) Hydrate from URL on first mount
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const q = params.get(K_Q);
    const cat = params.get(K_CAT);
    const ca = params.get(K_CA);
    const min = params.get(K_MIN);
    const max = params.get(K_MAX);

    if (q !== null) setSearchTerm(q);
    if (cat !== null) setSelectedCategoryId(cat || null);
    if (ca) {
      const d = dayjs(ca);
      setCreatedAfter(d.isValid() ? d : null);
    }
    if (min !== null && min !== '' && !isNaN(Number(min)))
      setMinPrice(Number(min));
    if (max !== null && max !== '' && !isNaN(Number(max)))
      setMaxPrice(Number(max));
  }, [
    params,
    setSearchTerm,
    setSelectedCategoryId,
    setCreatedAfter,
    setMinPrice,
    setMaxPrice,
  ]);

  const currentStr = useMemo(() => params.toString(), [params]);

  // 2) Push current store state to URL when it changes
  useEffect(() => {
    const next = new URLSearchParams(params);

    const setOrDel = (k: string, v: string | null | undefined) => {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    };

    setOrDel(K_Q, searchTerm);
    setOrDel(K_CAT, selectedCategoryId);
    setOrDel(K_CA, createdAfter ? createdAfter.toISOString() : null);
    setOrDel(K_MIN, Number.isFinite(minPrice) ? String(minPrice) : null);
    setOrDel(K_MAX, Number.isFinite(maxPrice) ? String(maxPrice) : null);

    const nextStr = next.toString();
    if (nextStr !== currentStr) setParams(next, { replace: true });
  }, [
    searchTerm,
    selectedCategoryId,
    createdAfter,
    minPrice,
    maxPrice,
    params,
    currentStr,
    setParams,
  ]);
}
