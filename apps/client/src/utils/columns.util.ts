// src/utils/columns.util.ts

/** Common dash placeholder for missing values */
export const DASH = '—';

/**
 * Safely coerce various date-like inputs (Date | string | number | Firestore Timestamp-like)
 * into a valid Date or undefined.
 */
export function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any)
  ) {
    const v = value as { seconds: number; nanoseconds?: number };
    const d = new Date(
      v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1_000_000),
    );
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}

/** Normalize an i18n language like "en-US" to a locale base like "en". */
export function getLocale(i18nLang?: string): string {
  return (i18nLang || 'en').split('-')[0];
}

/** Create a memoizable currency formatter for a given locale & currency. */
export function makeCurrencyFormatter(lng: string, currency = 'USD') {
  const nf = new Intl.NumberFormat(lng, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

/** Create a memoizable date-time formatter for a given locale. */
export function makeDateTimeFormatter(lng: string) {
  const df = new Intl.DateTimeFormat(lng, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (d: Date) => df.format(d);
}
