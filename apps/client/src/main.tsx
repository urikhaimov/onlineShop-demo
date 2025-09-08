// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { StoreBoundThemeProvider } from './providers/StoreBoundThemeProvider';
import { RedirectProvider } from './context/RedirectContext';
import { AuthProvider } from './context/AuthContext';
import { AbilityProvider } from './providers/AbilityProvider'; // <— new
import AppProviders from './providers/AppProviders';

import 'react-quill/dist/quill.snow.css';
import './styles.less';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreBoundThemeProvider>
      <BrowserRouter>
        <ErrorBoundary
          fallback={<p>⚠ Something went wrong. Our team has been notified!</p>}
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
