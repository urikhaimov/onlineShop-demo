export interface IStoreConfig {
  storeId: string;
  storeName: string;
  primaryColor: string;
  logoUrl: string;
  font: string;
  layout: 'grid' | 'list';
  currency: string;
  paypalClientId?: string;
  mode?: 'light' | 'dark'; // optional for dark mode support
}
