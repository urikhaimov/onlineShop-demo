import { createContext } from 'react';
import { IStoreConfig as StoreConfig, CDefaultCurrency } from '@common/types';

// A safe fallback config that satisfies all required fields
export const defaultConfig: StoreConfig = {
  storeId: 'default-store',
  storeName: 'Default Store',
  primaryColor: '#1976d2',
  logoUrl: '/assets/default-logo.svg',
  font: 'Noto Sans Hebrew',
  layout: 'grid',
  currency: CDefaultCurrency,
  paypalClientId: '',
  mode: 'light',
};

// Non-nullable context (no need for null checks in components)
export const StoreConfigContext = createContext<StoreConfig>(defaultConfig);
