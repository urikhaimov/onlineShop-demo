// src/hooks/useOrdersQuerySync.ts
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type Args = {
  searchTerm: string;
  status: string | null;
  dateFrom: string | null; // expected "YYYY-MM-DD" or null
  dateTo: string | null; // expected "YYYY-MM-DD" or null

  setSearchTerm: (v: string) => void;
  setStatus: (v: string | null) => void;
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
};

const K_Q = 'q';
const K_STATUS = 'status';
const K_FROM = 'from';
const K_TO = 'to';

export function useOrdersQuerySync({
  searchTerm,
  status,
  dateFrom,
  dateTo,
  setSearchTerm,
  setStatus,
  setDateFrom,
  setDateTo,
}: Args) {
  const [params, setParams] = useSearchParams();
  const didInit = useRef(false);

  // 1) Hydrate from URL once
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const q = params.get(K_Q);
    const st = params.get(K_STATUS);
    const df = params.get(K_FROM);
    const dt = params.get(K_TO);

    if (q !== null) setSearchTerm(q);
    // treat empty string as null (no filter)
    if (st !== null) setStatus(st || null);
    if (df !== null) setDateFrom(df || null);
    if (dt !== null) setDateTo(dt || null);
  }, [params, setSearchTerm, setStatus, setDateFrom, setDateTo]);

  const currentStr = useMemo(() => params.toString(), [params]);

  // 2) Write to URL whenever state changes
  useEffect(() => {
    const next = new URLSearchParams(params);

    const setOrDel = (k: string, v: string | null | undefined) => {
      if (!v) next.delete(k);
      else next.set(k, v);
    };

    setOrDel(K_Q, searchTerm);
    setOrDel(K_STATUS, status);
    setOrDel(K_FROM, dateFrom);
    setOrDel(K_TO, dateTo);

    const nextStr = next.toString();
    if (nextStr !== currentStr) setParams(next, { replace: true });
  }, [searchTerm, status, dateFrom, dateTo, params, currentStr, setParams]);
}
