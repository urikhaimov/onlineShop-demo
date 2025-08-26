// src/providers/AppProviders.tsx
import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/i18n';

import { CacheProvider } from '@emotion/react';
import { ltrCache, rtlCache } from '../theme/rtlCache';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import dayjs from 'dayjs';
import 'dayjs/locale/he';
import 'dayjs/locale/en';

function FrameworkProviders({ children }: { children: React.ReactNode }) {
  // read current lang directly and subscribe to changes
  const [lang, setLang] = React.useState(i18n.language || 'en');

  React.useEffect(() => {
    const handle = (lng: string) => setLang(lng || 'en');
    i18n.on('languageChanged', handle);
    return () => i18n.off('languageChanged', handle);
  }, []);

  const isHebrew = lang.startsWith('he');
  const dir: 'rtl' | 'ltr' = isHebrew ? 'rtl' : 'ltr';
  const adapterLocale = isHebrew ? 'he' : 'en';

  // keep <html> and dayjs in sync — after mount
  React.useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('lang', lang);
    el.setAttribute('dir', dir);
    dayjs.locale(adapterLocale);
  }, [lang, dir, adapterLocale]);

  const cache = dir === 'rtl' ? rtlCache : ltrCache;

  return (
    <CacheProvider value={cache}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={adapterLocale}
      >
        {/* Anything that might suspend (translations, dynamic imports) is safe here */}
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </LocalizationProvider>
    </CacheProvider>
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nextProvider i18n={i18n}>
      <FrameworkProviders>{children}</FrameworkProviders>
    </I18nextProvider>
  );
}
