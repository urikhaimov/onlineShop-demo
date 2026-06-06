// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from '@sentry/react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { StoreBoundThemeProvider } from './providers/StoreBoundThemeProvider';
import { RedirectProvider } from './context/RedirectContext';
import { AuthProvider } from './context/AuthContext';
import { AbilityProvider } from './providers/AbilityProvider';
import AppProviders from './providers/AppProviders';
import ErrorFallback from './components/ErrorFallback';

import 'react-quill/dist/quill.snow.css';
import './styles.less';

// Initialize Sentry early so the ErrorBoundary below can report to it.
// No-op when VITE_SENTRY_DSN is unset (e.g. dev / preview).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreBoundThemeProvider>
      <BrowserRouter>
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <ErrorFallback error={error} resetError={resetError} />
          )}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AbilityProvider>
                <RedirectProvider>
                  <AppProviders>
                    <App />
                  </AppProviders>
                </RedirectProvider>
              </AbilityProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </StoreBoundThemeProvider>
  </React.StrictMode>,
);
