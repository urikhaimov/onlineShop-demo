import Handlebars from 'handlebars';

type HB = typeof Handlebars;

function isLikelyLocale(s: any): boolean {
  const v = String(s ?? '').trim();
  return /^(?:[a-z]{2}(?:-[A-Z]{2})?)$/i.test(v); // he | he-IL | en | en-US
}
function isLikelyCurrency(s: any): boolean {
  const v = String(s ?? '').trim();
  return /^[A-Za-z]{3}$/.test(v); // ILS, USD, EUR...
}

function fmtMoney(amountMinor: any, currency?: any, locale?: any) {
  const curr = String(currency || 'ILS').toUpperCase();
  const major = (Number(amountMinor) || 0) / 100;

  // prefer explicit locale, else infer from currency (ILS → he-IL), else 'en'
  const loc =
    String(locale || (curr === 'ILS' ? 'he-IL' : 'en')).trim() || 'en';

  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr,
    }).format(major);
  } catch {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: curr,
    }).format(major);
  }
}

export function registerEmailHelpers(hb?: HB): void {
  const H = hb ?? Handlebars;

  // logic/text
  H.registerHelper('eq', (a, b) => a === b);
  H.registerHelper('not', (a) => !a);
  H.registerHelper('and', (a, b) => a && b);
  H.registerHelper('or', (a, b) => a || b);
  H.registerHelper('tern', (c, a, b) => (c ? a : b));
  H.registerHelper('uppercase', (s: any) => String(s ?? '').toUpperCase());
  H.registerHelper('lowercase', (s: any) => String(s ?? '').toLowerCase());

  // dates
  H.registerHelper('formatDate', (iso: any, locale?: any, opts?: any) => {
    const d = new Date(String(iso || ''));
    if (isNaN(d.valueOf())) return '';
    try {
      return new Intl.DateTimeFormat(
        String(locale || 'en'),
        opts?.hash || {},
      ).format(d);
    } catch {
      return d.toISOString();
    }
  });

  // money (flexible arg order + named args)
  H.registerHelper(
    'price',
    function (minor: any, a?: any, b?: any, opts?: any) {
      // Handlebars passes the options hash as the last arg
      const o =
        opts && typeof opts === 'object' && 'hash' in opts ? (opts as any) : {};
      let currency = a;
      let locale = b;

      // Named params win
      if (o.hash?.currency) currency = o.hash.currency;
      if (o.hash?.locale) locale = o.hash.locale;

      // If the "currency" looks like a locale (e.g., 'he' / 'he-IL'), swap
      if (!currency || isLikelyLocale(currency)) {
        locale = locale || currency;
        // fall back to root context currency if present
        currency = o?.data?.root?.currency || 'ILS';
      }

      // Make sure we didn’t accidentally pass something like 'HE' as currency
      if (!isLikelyCurrency(currency)) {
        // try to recover from uppercase locale, e.g., 'HE'
        if (isLikelyLocale(currency)) {
          locale = locale || currency;
          currency = o?.data?.root?.currency || 'ILS';
        } else {
          currency = 'ILS';
        }
      }

      // Default locale from root (renderer injects lang), or 'en'
      if (!locale) locale = o?.data?.root?.lang || 'en';

      return fmtMoney(minor, currency, locale);
    },
  );

  // alias
  H.registerHelper('formatMoney', (minor: any, currency?: any, locale?: any) =>
    fmtMoney(minor, currency, locale),
  );

  // misc
  H.registerHelper('json', (v: any) => JSON.stringify(v, null, 2));
}
