import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// import HttpBackend from 'i18next-http-backend';
import { logger } from '@common/utils';

import enTranslations from '@client/locales/en/common.json';
import heTranslations from '@client/locales/he/common.json';

console.log('enTranslations', enTranslations);
// console.log('heTranslations', heTranslations);

// Optional: a tiny date/number formatter using Intl
const format = (value: any, format: string | undefined, lng: string) => {
  if (format === 'datetime') {
    try {
      return new Intl.DateTimeFormat(lng, { dateStyle: 'medium' }).format(
        new Date(value),
      );
    } catch {
      return value;
    }
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat(lng).format(value);
  }
  return value;
};

i18n
  // .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en'],
    ns: ['common'],
    defaultNS: 'common',
    debug: true,
    react: {
      useSuspense: false, // Prevents Suspense issues
    },
    resources: {
      en: {
        common: enTranslations,
      },
      he: {
        common: heTranslations,
      },
    },
    detection: {
      // localStorage, navigator, querystring (?lng=he), etc.
      order: ['localStorage', 'querystring', 'navigator', 'cookie', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
      format: (value, fmt, lng) => format(value, fmt, lng ?? 'en'),
    },
    returnEmptyString: false,
    nonExplicitSupportedLngs: true,
    cleanCode: true,
  })
  .then(() => {
    logger.info('i18n initialized');
  });

export default i18n;
