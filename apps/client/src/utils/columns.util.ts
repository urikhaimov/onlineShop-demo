// src/utils/columns.util.ts
import { CDefaultCurrencySymbol } from '@common/types';

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
    // Firestore-like { seconds, nanoseconds }
    'seconds' in (value as Record<string, unknown>)
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

/** Try to convert any input to a finite number; otherwise return undefined. */
function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// Currency formatting (symbol-first, with safe fallbacks)
// ────────────────────────────────────────────────────────────────────────────

type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

const FALLBACK_SYMBOL: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  KRW: '₩',
  AUD: 'A$',
  CAD: 'C$',
};

function isCurrencyCode(s: string): boolean {
  return /^[A-Za-z]{3}$/.test(s);
}

function currencySymbolFrom(code: string): string {
  return (
    FALLBACK_SYMBOL[code.toUpperCase()] ??
    CDefaultCurrencySymbol ??
    code.toUpperCase()
  );
}

/**
 * Currency formatter. Accepts either a 3-letter currency **code** (e.g., "ILS")
 * or a literal **symbol** (e.g., "₪"). When a code is provided, it uses Intl
 * with `currencyDisplay: 'narrowSymbol'` and replaces any lingering code with
 * a known symbol as a fallback.
 */
export function makeCurrencyFormatter(
  currencyOrSymbol: string = CDefaultCurrencySymbol,
  locale?: string,
  opts?: {
    display?: CurrencyDisplay; // default: 'narrowSymbol'
    minFrac?: number; // default: 2
    maxFrac?: number; // default: 2
  },
) {
  const loc =
    locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');

  // If caller passed a 3-letter code → use Intl
  if (isCurrencyCode(currencyOrSymbol)) {
    const code = currencyOrSymbol.toUpperCase();
    const fmt = new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: code,
      currencyDisplay: opts?.display ?? 'narrowSymbol',
      minimumFractionDigits: opts?.minFrac ?? 2,
      maximumFractionDigits: opts?.maxFrac ?? 2,
    });

    return (value: unknown): string => {
      const n = toFiniteNumber(value);
      if (n === undefined) return DASH;

      let out = fmt.format(n);

      // Fallback: If some locales still yield the code (e.g., "ILS 4.00"),
      // replace it with a known symbol.
      if (/\b[A-Z]{3}\b/.test(out)) {
        out = out.replace(code, currencySymbolFrom(code));
      }

      return out;
    };
  }

  // Otherwise treat input as a literal symbol
  const symbol = currencyOrSymbol || CDefaultCurrencySymbol || '';
  return (value: unknown): string => {
    const n = toFiniteNumber(value);
    return n === undefined ? DASH : `${symbol} ${n.toFixed(2)}`;
  };
}

/** Create a memoizable date-time formatter for a given locale. */
export function makeDateTimeFormatter(lng: string) {
  const df = new Intl.DateTimeFormat(lng, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (d: Date) => df.format(d);
}
