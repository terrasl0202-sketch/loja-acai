/**
 * @module Legacy Bridge
 * @description Ponte de compatibilidade entre arquitetura antiga e nova
 * 
 * @architecture
 * Este arquivo mantem compatibilidade com o codigo existente enquanto
 * permite migracao gradual para a nova arquitetura.
 * 
 * IMPORTANTE: NAO modifica comportamento existente, apenas adiciona
 * uma camada de abstracao.
 * 
 * @migration
 * 1. Componentes novos: usar @/lib/services diretamente
 * 2. Componentes antigos: continuam funcionando via este bridge
 * 3. Gradualmente migrar componentes antigos para nova arquitetura
 */

import { storeService } from '@/lib/services/store-service'
import { orderService } from '@/lib/services/order-service'
import type { StoreSettings } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// STORE STATUS BRIDGE
// Mantem compatibilidade com lib/supabase/store-status.ts
// =============================================================================

/**
 * Formato do StoreStatus antigo (compatibilidade)
 */
export interface LegacyStoreStatus {
  storeOpen: boolean
  manualControl: boolean
  updatedAt: string
  source: 'supabase' | 'local' | 'auto'
}

/**
 * Converte StoreSettings novo para formato antigo
 */
export function settingsToLegacyStatus(settings: StoreSettings): LegacyStoreStatus {
  return {
    storeOpen: settings.storeOpen,
    manualControl: settings.manualControl,
    updatedAt: settings.updatedAt,
    source: 'local'
  }
}

/**
 * Busca status da loja usando nova arquitetura
 * Compativel com fetchStoreStatus() antigo
 */
export async function fetchStoreStatusBridge(): Promise<{
  data: LegacyStoreStatus
  error: string | null
}> {
  try {
    const settings = await storeService.getSettings()
    return {
      data: settingsToLegacyStatus(settings),
      error: null
    }
  } catch (error) {
    return {
      data: {
        storeOpen: true,
        manualControl: false,
        updatedAt: new Date().toISOString(),
        source: 'auto'
      },
      error: 'Erro ao carregar status'
    }
  }
}

/**
 * Atualiza status usando nova arquitetura
 * Compativel com updateStoreStatus() antigo
 */
export async function updateStoreStatusBridge(
  storeOpen: boolean,
  manualControl: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    await storeService.saveSettings({ storeOpen, manualControl })
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: 'Erro ao salvar status' }
  }
}

// =============================================================================
// ADMIN SETTINGS BRIDGE
// Mantem compatibilidade com lib/supabase/admin-settings.ts
// =============================================================================

/**
 * Formato AdminSettings antigo (compatibilidade)
 */
export interface LegacyAdminSettings {
  id: string
  storeName: string
  storeOpen: boolean
  manualControl: boolean
  openingTime: string
  closingTime: string
  deliveryFee: number
  minimumOrder: number
  whatsappNumber: string
  pixKey: string
  address: string
  closedMessage: string
  updatedAt: string
}

/**
 * Converte StoreSettings novo para formato antigo
 */
export function settingsToLegacyAdmin(settings: StoreSettings): LegacyAdminSettings {
  return {
    id: 'main',
    storeName: settings.storeName,
    storeOpen: settings.storeOpen,
    manualControl: settings.manualControl,
    openingTime: settings.openTime,
    closingTime: settings.closeTime,
    deliveryFee: 5, // TODO: pegar de delivery config
    minimumOrder: settings.minOrderValue,
    whatsappNumber: settings.whatsapp,
    pixKey: '', // TODO: pegar de payment config
    address: settings.address,
    closedMessage: settings.closedMessage,
    updatedAt: settings.updatedAt
  }
}

/**
 * Converte formato antigo para StoreSettings novo
 */
export function legacyAdminToSettings(legacy: Partial<LegacyAdminSettings>): Partial<StoreSettings> {
  const settings: Partial<StoreSettings> = {}
  
  if (legacy.storeName !== undefined) settings.storeName = legacy.storeName
  if (legacy.storeOpen !== undefined) settings.storeOpen = legacy.storeOpen
  if (legacy.manualControl !== undefined) settings.manualControl = legacy.manualControl
  if (legacy.openingTime !== undefined) settings.openTime = legacy.openingTime
  if (legacy.closingTime !== undefined) settings.closeTime = legacy.closingTime
  if (legacy.minimumOrder !== undefined) settings.minOrderValue = legacy.minimumOrder
  if (legacy.whatsappNumber !== undefined) settings.whatsapp = legacy.whatsappNumber
  if (legacy.address !== undefined) settings.address = legacy.address
  if (legacy.closedMessage !== undefined) settings.closedMessage = legacy.closedMessage
  
  return settings
}

/**
 * Busca admin settings usando nova arquitetura
 * Compativel com fetchAdminSettings() antigo
 */
export async function fetchAdminSettingsBridge(): Promise<{
  data: LegacyAdminSettings
  source: 'supabase' | 'local' | 'default'
  error: string | null
}> {
  try {
    const settings = await storeService.getSettings()
    return {
      data: settingsToLegacyAdmin(settings),
      source: 'local',
      error: null
    }
  } catch (error) {
    return {
      data: settingsToLegacyAdmin({} as StoreSettings),
      source: 'default',
      error: 'Erro ao carregar settings'
    }
  }
}

/**
 * Salva admin settings usando nova arquitetura
 * Compativel com saveAdminSettings() antigo
 */
export async function saveAdminSettingsBridge(
  settings: Partial<LegacyAdminSettings>
): Promise<{
  success: boolean
  savedTo: 'supabase' | 'local'
  error: string | null
}> {
  try {
    const newSettings = legacyAdminToSettings(settings)
    await storeService.saveSettings(newSettings)
    return { success: true, savedTo: 'local', error: null }
  } catch (error) {
    return { success: false, savedTo: 'local', error: 'Erro ao salvar settings' }
  }
}

// =============================================================================
// STORAGE KEYS COMPATIBILITY
// =============================================================================

/**
 * Chaves de storage antigas mapeadas para novas
 * Para uso em migracao
 */
export const LEGACY_TO_NEW_KEYS: Record<string, string> = {
  'pk-store-status': STORAGE_KEYS.STORE_STATUS,
  'pk-admin-settings': STORAGE_KEYS.STORE_SETTINGS,
  'pk-orders': STORAGE_KEYS.ORDERS,
  'pk-products': STORAGE_KEYS.PRODUCTS,
  'customer-data': STORAGE_KEYS.CUSTOMER_DATA,
}

// =============================================================================
// EXPORTS
// =============================================================================

// Re-exports para facilitar migracao
export { storeService } from '@/lib/services/store-service'
export { orderService } from '@/lib/services/order-service'
export { customerService } from '@/lib/services/customer-service'
export { productService } from '@/lib/services/product-service'
export { deliveryService } from '@/lib/services/delivery-service'
