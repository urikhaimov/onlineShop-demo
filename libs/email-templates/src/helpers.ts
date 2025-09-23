export function registerEmailHelpers() {
  Handlebars.registerHelper(
    'eq',
    function (this: Handlebars.HelperOptions, a: any, b: any, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
  );

  Handlebars.registerHelper(
    'price',
    function (
      cents: number,
      lang: 'en' | 'he',
      currency: 'ILS' | 'USD' | 'EUR' | 'GBP' = 'ILS',
    ) {
      const locale = lang === 'he' ? 'he-IL' : 'en-US';
      const value = (Number(cents) || 0) / 100;
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(value);
      } catch {
        const symbol =
          currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;
        return `${symbol}${value.toFixed(2)}`;
      }
    },
  );

  Handlebars.registerHelper(
    'formatDate',
    function (iso: string, lang: 'en' | 'he') {
      const d = new Date(iso);
      const locale = lang === 'he' ? 'he-IL' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    },
  );
}
