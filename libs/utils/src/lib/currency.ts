export type CurrencyCode =
  | 'ILS'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'SEK'
  | 'DKK'
  | 'NOK'
  | 'JPY'
  | 'HUF'
  | 'IDR'
  | 'KRW'
  | 'VND'
  | string;

// Main export
export const ZERO_DECIMAL_CURRENCIES = new Set<CurrencyCode>([
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

// Optional alias to avoid breaking existing imports (ZERO_DEC)
export const ZERO_DEC = ZERO_DECIMAL_CURRENCIES;
