import { CurrencyCode, ZERO_DECIMAL_CURRENCIES } from '@common/types';

/** Convert MAJOR (₪ / $, etc.) → MINOR (agorot / cents) */
export function toMinor(major: number, currency: CurrencyCode): number {
  const cur = String(currency).toUpperCase();
  const value = Number.isFinite(major) ? Number(major) : 0;
  return ZERO_DECIMAL_CURRENCIES.has(cur)
    ? Math.round(value)
    : Math.round(value * 100);
}

/** Convert MINOR (agorot / cents) → MAJOR (₪ / $, etc.) */
export function toMajor(minor: number, currency: CurrencyCode): number {
  const cur = String(currency).toUpperCase();
  const value = Number.isFinite(minor) ? Number(minor) : 0;
  return ZERO_DECIMAL_CURRENCIES.has(cur) ? Math.round(value) : value / 100;
}
