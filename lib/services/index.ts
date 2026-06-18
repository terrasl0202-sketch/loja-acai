/**
 * @module Services Index
 * @description Hub central de services - camada de negocio da aplicacao
 * 
 * @example
 * import { storeService, orderService, customerService } from '@/lib/services'
 * 
 * // Store settings
 * const settings = await storeService.getSettings()
 * await storeService.saveSettings({ storeName: 'Nova Loja' })
 * 
 * // Orders
 * const orders = await orderService.getAll()
 * await orderService.updateStatus(orderId, 'confirmed')
 * 
 * // Customers
 * const session = await customerService.loginByPhone('11999999999')
 * 
 * @architecture
 * - Cada service encapsula logica de negocio
 * - Usa StorageAdapter para persistencia
 * - Emite eventos para sincronizacao
 * - Preparado para multi-loja (storeId)
 * 
 * @migration
 * Para migrar pro Supabase:
 * 1. Mudar o storage adapter em /lib/storage
 * 2. Services continuam funcionando sem mudanca
 */

// =============================================================================
// SERVICES
// =============================================================================

export { storeService } from './store-service'
export { orderService } from './order-service'
export { customerService } from './customer-service'
export { productService } from './product-service'
export { deliveryService } from './delivery-service'
export { checkoutStorageService } from './checkout-storage-service'
export { customerSessionService } from './customer-session-service'

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Tipos mais usados
export type { Order, OrderStatus, OrderFilters, OrderStats } from '@/types'
export type { Customer, CustomerSession } from '@/types'
export type { Product, CartItem } from '@/types'
export type { StoreSettings, StoreStatus } from '@/types'
export type { NeighborhoodFee, DeliveryPerson } from '@/types'
