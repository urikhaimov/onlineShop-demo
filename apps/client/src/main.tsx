// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';

import { StoreBoundThemeProvider } from './providers/StoreBoundThemeProvider';
import {
  defaultConfig,
  StoreConfigContext,
} from './context/StoreConfigContext';
import { RedirectProvider } from './context/RedirectContext';
import { AuthProvider } from './context/AuthContext';
import { AbilityContext } from './context/AbilityContext';
import { defineAbilityFor } from './services/ability.service';

// IMPORTANT: AppProviders must NOT wrap ThemeProvider/CssVarsProvider
import AppProviders from './providers/AppProviders';

import 'react-quill/dist/quill.snow.css';
import './styles.less';

const storeId = localStorage.getItem('storeId') || 'store1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreBoundThemeProvider>
      <BrowserRouter>
        <ErrorBoundary
          fallback={<p>⚠ Something went wrong. Our team has been notified!</p>}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AbilityContext.Provider
                value={defineAbilityFor({ user: null, role: null })}
              >
                <RedirectProvider>
                  <AppProviders>
                    <App />
                  </AppProviders>
                </RedirectProvider>
              </AbilityContext.Provider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </StoreBoundThemeProvider>
  </React.StrictMode>,
);
