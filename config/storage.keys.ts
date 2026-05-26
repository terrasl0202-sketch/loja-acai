/**
 * @module Storage Keys
 * @description Chaves centralizadas do localStorage
 * 
 * @architecture
 * - Todas as chaves de storage em um lugar
 * - Evita typos e duplicacao
 * - Facilita migracao futura
 * - Preparado para multi-loja com getStoreKey()
 * 
 * @example
 * import { STORAGE_KEYS, getStoreKey } from '@/config/storage.keys'
 * 
 * // Chave global
 * const ordersKey = STORAGE_KEYS.ORDERS // 'pk-orders'
 * 
 * // Chave por loja (multi-loja)
 * const storeOrdersKey = getStoreKey('store-123', 'orders') // 'store:store-123:orders'
 */

// =============================================================================
// GLOBAL STORAGE KEYS
// =============================================================================

/**
 * Chaves de localStorage usadas pela aplicacao
 * Prefixo 'pk-' = Public Key (dados publicos da loja)
 */
export const STORAGE_KEYS = {
  // Store
  STORE_STATUS: 'pk-store-status',
  STORE_SETTINGS: 'pk-admin-settings', // Compatibilidade com codigo existente
  
  // Products
  PRODUCTS: 'pk-products',
  CATEGORIES: 'pk-categories',
  
  // Orders
  ORDERS: 'pk-orders',
  CART: 'pk-cart',
  
  // Customers
  CUSTOMERS: 'pk-customers',
  CUSTOMER_SESSION: 'pk-customer-session',
  CUSTOMER_DATA: 'customer-data', // Compatibilidade
  
  // Delivery
  NEIGHBORHOODS: 'pk-neighborhoods',
  DELIVERY_CONFIG: 'pk-delivery-config',
  DELIVERY_PERSONS: 'pk-delivery-persons',
  
  // Payment
  PIX_CONFIG: 'pk-pix-config',
  ASAAS_CONFIG: 'pk-asaas-config',
  
  // Admin
  ADMIN_SESSION: 'admin-session',
  ADMIN_AUTH: 'admin-auth',
  
  // UI State
  THEME: 'theme',
  SIDEBAR_STATE: 'sidebar-state',
  
  // Tracking
  DELIVERY_TOKEN: 'delivery-token',
  TRACKING_SESSION: 'tracking-session',
} as const

// Type for storage keys
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// =============================================================================
// MULTI-LOJA KEYS
// =============================================================================

/**
 * Gera chave com namespace da loja
 * Util para sistema multi-loja
 * 
 * @example
 * getStoreKey('store-123', 'orders') // 'store:store-123:orders'
 * getStoreKey('store-123', STORAGE_KEYS.ORDERS) // 'store:store-123:pk-orders'
 */
export function getStoreKey(storeId: string, key: string): string {
  return `store:${storeId}:${key}`
}

/**
 * Gera chave com namespace do tenant
 * Util para sistema SaaS multi-tenant
 * 
 * @example
 * getTenantKey('tenant-abc', 'store-123', 'orders') // 'tenant:tenant-abc:store:store-123:orders'
 */
export function getTenantKey(tenantId: string, storeId: string, key: string): string {
  return `tenant:${tenantId}:store:${storeId}:${key}`
}

// =============================================================================
// LEGACY KEYS (COMPATIBILIDADE)
// =============================================================================

/**
 * Mapeamento de chaves antigas para novas
 * Usar para migracao gradual
 */
export const LEGACY_KEYS_MAP: Record<string, string> = {
  'admin-settings': STORAGE_KEYS.STORE_SETTINGS,
  'store-settings': STORAGE_KEYS.STORE_STATUS,
  'produtos': STORAGE_KEYS.PRODUCTS,
  'pedidos': STORAGE_KEYS.ORDERS,
  'bairros': STORAGE_KEYS.NEIGHBORHOODS,
}

/**
 * Migra dados de chaves antigas para novas
 * Executar uma vez na inicializacao
 */
export async function migrateLegacyKeys(): Promise<void> {
  if (typeof window === 'undefined') return
  
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS_MAP)) {
    const oldData = localStorage.getItem(oldKey)
    const newData = localStorage.getItem(newKey)
    
    // Se tem dado antigo e nao tem novo, migra
    if (oldData && !newData) {
      localStorage.setItem(newKey, oldData)
      console.log(`[Migration] Migrado ${oldKey} -> ${newKey}`)
    }
  }
}
