import { storesConfig } from '../config/storeConfig';
import type { StoreConfig } from '../types/StoreConfig';

export function loadStoreConfig(storeId: string): StoreConfig {
  return storesConfig[storeId] ?? storesConfig['tech-store'];
}
