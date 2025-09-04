/** ISO-4217 currencies with zero fractional units */
export const ZERO_DEC = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Minor → Major respecting zero-decimal currencies */
export function minorToMajor(minor: number, currency: string): number {
  const cur = (currency || 'USD').toUpperCase();
  const m = Math.max(0, Math.round(Number(minor) || 0));
  return ZERO_DEC.has(cur) ? m : m / 100;
}

/** Major → Minor respecting zero-decimal currencies */
export function majorToMinor(major: number, currency: string): number {
  const cur = (currency || 'USD').toUpperCase();
  const a = Number(major) || 0;
  return ZERO_DEC.has(cur) ? Math.round(a) : Math.round(a * 100);
}

/** 🔙 Back-compat aliases (so older imports keep working) */
export const toMajor = minorToMajor; // minor → major
export const toMinor = majorToMinor; // major → minor

/** Small currency-specific minimums (minor units). Extend as needed. */
export const MIN_MINOR_BY_CURRENCY: Record<string, number> = {
  ILS: 200,
  USD: 50,
  EUR: 50,
  GBP: 30,
  JPY: 50,
};
