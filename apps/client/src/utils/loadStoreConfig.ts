import { storesConfig } from '../config/storeConfig';
import { IStoreConfig as StoreConfig } from '@common/types';
export function loadStoreConfig(storeId: string): StoreConfig {
  return storesConfig[storeId] ?? storesConfig['tech-store'];
}
