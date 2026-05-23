import { CDefaultCurrency, IStoreConfig as StoreConfig } from '@common/types';
export const storesConfig: Record<string, StoreConfig> = {
  'tech-store': {
    storeId: 'tech-store',
    storeName: 'Tech Store',
    primaryColor: '#1976d2',
    logoUrl: '/assets/tech-logo.svg',
    font: 'Noto Sans Hebrew',
    layout: 'grid',
    currency: CDefaultCurrency,
    paypalClientId: '',
    mode: 'light',
  },
  'fashion-boutique': {
    storeId: 'fashion-boutique',
    storeName: 'Fashion Boutique',
    primaryColor: '#d81b60',
    logoUrl: '/assets/fashion-logo.svg',
    font: 'Playfair Display',
    layout: 'list',
    currency: CDefaultCurrency,
    paypalClientId: '',
    mode: 'dark',
  },
};
