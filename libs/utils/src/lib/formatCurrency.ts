import { ECurrency } from '@common/types';
import i18n from 'i18next';
export const formatCurrency = (
  value: number,
  code: ECurrency.ILS,
  locale?: string,
) =>
  new Intl.NumberFormat(
    (locale ?? (typeof i18n !== 'undefined' ? i18n.language : 'en-IL')) ||
      'en-IL',
    {
      style: 'currency',
      currency: code, // ✅ CODE, not symbol
      currencyDisplay: 'symbol', // shows $, €, £, ₪
      maximumFractionDigits: 0,
    },
  ).format(value);
