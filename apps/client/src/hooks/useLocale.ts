import { useMemo } from 'react';
import {
  getLocale,
  makeCurrencyFormatter,
  makeDateTimeFormatter,
} from '../utils/columns.util';
import { useTranslation } from 'react-i18next';
import { CDefaultCurrency } from '@common/types';

/** Normalize a language string (e.g., "en-US" → "en") with memoization */
export function useLocale() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  return useMemo(() => getLocale(lang), [lang]);
}

/** Locale-aware memoized formatters (currency + datetime) */
export function useLocaleFormatters(currency = CDefaultCurrency) {
  const lng = useLocale();
  const formatCurrency = useMemo(
    () => makeCurrencyFormatter(),
    [lng, currency],
  );
  const formatDateTime = useMemo(() => makeDateTimeFormatter(lng), [lng]);
  return { lng, formatCurrency, formatDateTime };
}
