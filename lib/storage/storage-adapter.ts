/**
 * @module Storage Adapter
 * @description Factory e configuracao do storage adapter
 * 
 * @architecture
 * - Hoje usa LocalStorageAdapter
 * - No futuro, trocar para SupabaseStorageAdapter aqui
 * - Todo o resto da aplicacao nao precisa mudar
 * 
 * @example
 * import { storage } from '@/lib/storage'
 * 
 * // Ler
 * const settings = await storage.get<StoreSettings>('settings')
 * 
 * // Salvar
 * await storage.set('settings', newSettings)
 * 
 * // Remover
 * await storage.remove('settings')
 */

import type { StorageAdapter, StorageOptions } from './types'
import { LocalStorageAdapter, createLocalStorage } from './local-storage'

// =============================================================================
// STORAGE FACTORY
// =============================================================================

export type StorageType = 'localStorage' | 'supabase' | 'memory'

/**
 * Cria um storage adapter baseado no tipo
 * Hoje: sempre retorna localStorage
 * Futuro: pode retornar Supabase baseado em config
 */
export function createStorage(
  type: StorageType = 'localStorage',
  options: StorageOptions = {}
): StorageAdapter {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(options)
    
    // Futuro: implementar SupabaseStorageAdapter
    // case 'supabase':
    //   return new SupabaseStorageAdapter(options)
    
    default:
      return new LocalStorageAdapter(options)
  }
}

// =============================================================================
// DEFAULT STORAGE INSTANCE
// =============================================================================

/**
 * Instancia padrao de storage para toda a aplicacao
 * 
 * @migration
 * Para migrar pro Supabase:
 * 1. Criar SupabaseStorageAdapter implementando StorageAdapter
 * 2. Mudar esta linha para: createStorage('supabase')
 * 3. Pronto! Todo o resto continua funcionando
 */
export const storage = createStorage('localStorage')

// =============================================================================
// NAMESPACED STORAGE (MULTI-LOJA)
// =============================================================================

/**
 * Cache de storages por storeId
 */
const storeStorages = new Map<string, StorageAdapter>()

/**
 * Retorna um storage com namespace para uma loja especifica
 * Util para sistema multi-loja
 * 
 * @example
 * const myStoreStorage = getStoreStorage('store-123')
 * await myStoreStorage.set('orders', orders) // salva em 'store:store-123:orders'
 */
export function getStoreStorage(storeId: string): StorageAdapter {
  if (!storeStorages.has(storeId)) {
    const adapter = createLocalStorage(`store:${storeId}:`)
    storeStorages.set(storeId, adapter)
  }
  return storeStorages.get(storeId)!
}

/**
 * Limpa cache de storages (util para logout)
 */
export function clearStorageCache(): void {
  storeStorages.clear()
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type { StorageAdapter, StorageOptions, StorageResult } from './types'
export { LocalStorageAdapter, createLocalStorage } from './local-storage'
