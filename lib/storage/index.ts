/**
 * @module Storage
 * @description Camada de abstracao de persistencia
 * 
 * @example
 * import { storage, getStoreStorage } from '@/lib/storage'
 * 
 * // Storage padrao
 * const settings = await storage.get('pk-store-status')
 * 
 * // Storage por loja (multi-loja)
 * const storeStorage = getStoreStorage('store-123')
 * await storeStorage.set('orders', orders)
 * 
 * @architecture
 * - storage: instancia padrao para uso geral
 * - getStoreStorage: cria storage com namespace por loja
 * - StorageAdapter: interface abstrata
 * - LocalStorageAdapter: implementacao atual
 * 
 * @migration
 * Para migrar pro Supabase, editar storage-adapter.ts
 * e trocar createStorage('localStorage') por createStorage('supabase')
 */

// Main exports
export { 
  storage,
  createStorage,
  getStoreStorage,
  clearStorageCache,
  LocalStorageAdapter,
  createLocalStorage
} from './storage-adapter'

// Types
export type { 
  StorageAdapter,
  StorageOptions,
  StorageResult,
  StorageEvent,
  StorageEventListener,
  StorageMetadata
} from './types'
