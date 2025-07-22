import { StoreConfig } from '../types/StoreConfig';

export const storesConfig: Record<string, StoreConfig> = {
  'tech-store': {
    storeId: 'tech-store',
    storeName: 'Tech Store',
    primaryColor: '#1976d2',
    logoUrl: '/assets/tech-logo.svg',
    font: 'Roboto',
    layout: 'grid',
    currency: 'USD',
    stripeKey: 'pk_test_tech_1234',
    mode: 'light',
  },
  'fashion-boutique': {
    storeId: 'fashion-boutique',
    storeName: 'Fashion Boutique',
    primaryColor: '#d81b60',
    logoUrl: '/assets/fashion-logo.svg',
    font: 'Playfair Display',
    layout: 'list',
    currency: 'EUR',
    stripeKey: 'pk_test_fashion_5678',
    mode: 'dark',
  },
};
