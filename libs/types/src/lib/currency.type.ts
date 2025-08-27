export enum ECurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  ILS = 'ILS', // Israeli New Shekel
}

export const CDefaultCurrency = ECurrency.USD;

export const CURRENCY_SYMBOL: Record<ECurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
};
