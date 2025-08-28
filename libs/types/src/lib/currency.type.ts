export enum ECurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  ILS = 'ILS', // Israeli New Shekel
}

export const CDefaultCurrency = ECurrency.ILS;

export const CURRENCY_SYMBOL: Record<ECurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
};
export const CDefaultCurrencySymbol = CURRENCY_SYMBOL.ILS;
