import { createContext } from 'react';
import { IStoreConfig as StoreConfig, CDefaultCurrency } from '@common/types';

// A safe fallback config that satisfies all required fields
export const defaultConfig: StoreConfig = {
  storeId: 'default-store',
  storeName: 'Default Store',
  primaryColor: '#1976d2',
  logoUrl: '/assets/default-logo.svg',
  font: 'Arial',
  layout: 'grid',
  currency: CDefaultCurrency,
  stripeKey: 'pk_test_default_123456',
  mode: 'light',
};

// Non-nullable context (no need for null checks in components)
export const StoreConfigContext = createContext<StoreConfig>(defaultConfig);
