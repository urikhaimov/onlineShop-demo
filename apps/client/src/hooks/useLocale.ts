import { useMemo } from 'react';
import {
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../utils/columns.util';

/** Normalize a language string (e.g., "en-US" → "en") with memoization */
export function useLocale(lang?: string) {
  return useMemo(() => getLocale(lang), [lang]);
}

/** Locale-aware memoized formatters (currency + datetime) */
export function useLocaleFormatters(lang?: string, currency = 'USD') {
  const lng = useLocale(lang);
  const formatCurrency = useMemo(
    () => makeCurrencyFormatter(lng, currency),
    [lng, currency],
  );
  const formatDateTime = useMemo(() => makeDateTimeFormatter(lng), [lng]);
  return { lng, formatCurrency, formatDateTime };
}
