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

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { loadStoreConfig } from './utils/loadStoreConfig';

import { ThemeProvider } from './context/ThemeContext';

import 'react-quill/dist/quill.snow.css';
import './styles.less';

// Load store config
const storeId = localStorage.getItem('storeId') || 'store1';
const storeConfig = loadStoreConfig(storeId) ?? defaultConfig;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary
        fallback={<p>⚠ Something went wrong. Our team has been notified!</p>}
      >
        <StoreConfigContext.Provider value={storeConfig}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              {' '}
              {/* ✅ Must be inside QueryClientProvider */}
              <StoreBoundThemeProvider>
                <AuthProvider>
                  <AbilityContext.Provider
                    value={defineAbilityFor({ user: null, role: null })}
                  >
                    <RedirectProvider>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <App />
                      </LocalizationProvider>
                    </RedirectProvider>
                  </AbilityContext.Provider>
                </AuthProvider>
              </StoreBoundThemeProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </StoreConfigContext.Provider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
