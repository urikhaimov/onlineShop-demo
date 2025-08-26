// providers/AppProviders.tsx
import * as React from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';

import { CacheProvider } from '@emotion/react';
import { CssBaseline, createTheme } from '@mui/material';
import { ltrCache, rtlCache } from '../theme/rtlCache';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import dayjs from 'dayjs';
import 'dayjs/locale/he';
import 'dayjs/locale/en';

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language?.startsWith('he');
  const dir: 'rtl' | 'ltr' = isHebrew ? 'rtl' : 'ltr';
  const adapterLocale = isHebrew ? 'he' : 'en';

  React.useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('lang', i18n.language || 'en');
    el.setAttribute('dir', dir);
    dayjs.locale(adapterLocale);
  }, [i18n.language, dir, adapterLocale]);

  const theme = React.useMemo(
    () =>
      createTheme({
        direction: dir,
        typography: {
          fontFamily: isHebrew
            ? "'Heebo', 'Rubik', 'Segoe UI', Arial, sans-serif"
            : "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
        },
      }),
    [dir, isHebrew],
  );

  const cache = dir === 'rtl' ? rtlCache : ltrCache;

  return (
    <CacheProvider value={cache}>
      <CssBaseline />
      {/* ⬇️ Make MUI X pickers happy + localized */}
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={adapterLocale}
      >
        {children}
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
      <InnerProviders>{children}</InnerProviders>
    </I18nextProvider>
  );
}
