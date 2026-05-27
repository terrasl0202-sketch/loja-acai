/**
 * @module Config Index
 * @description Hub de configuracoes centralizadas
 * 
 * @example
 * import { APP_CONFIG, DEFAULTS, ROUTES, STORAGE_KEYS } from '@/config'
 * 
 * // App config
 * if (APP_CONFIG.features.enablePix) { ... }
 * 
 * // Routes
 * router.push(ROUTES.admin)
 * 
 * // Storage
 * storage.get(STORAGE_KEYS.ORDERS)
 */

// App config
export { APP_CONFIG, DEFAULTS, ROUTES } from './app.config'
export type { AppConfig, Defaults, Routes } from './app.config'

// Storage keys
export { 
  STORAGE_KEYS, 
  getStoreKey, 
  getTenantKey,
  migrateLegacyKeys,
  LEGACY_KEYS_MAP
} from './storage.keys'
export type { StorageKey } from './storage.keys'
