/**
 * @module Hooks Index
 * @description Hub de hooks globais reutilizaveis
 * 
 * @example
 * import { useStoreSettings, useOrders, useProducts, useCustomer } from '@/hooks'
 * 
 * // Em um componente
 * const { settings, isOpen, updateSettings } = useStoreSettings()
 * const { orders, pending, updateStatus } = useOrders()
 * const { products, categories, search } = useProducts()
 * const { customer, isLoggedIn, login, logout } = useCustomer()
 * 
 * @architecture
 * - Hooks encapsulam acesso aos services
 * - Gerenciam estado, loading e erros
 * - Auto-atualizam quando dados mudam
 * - Preparados para multi-loja
 */

// Store
export { useStoreSettings } from './useStoreSettings'
export type { UseStoreSettingsReturn } from './useStoreSettings'

// Orders
export { useOrders } from './useOrders'
export type { UseOrdersOptions, UseOrdersReturn } from './useOrders'

// Admin Orders (abstrai chamadas de API do Admin)
export { useAdminOrders } from './useAdminOrders'
export type { 
  UseAdminOrdersOptions, 
  UseAdminOrdersReturn, 
  OrderStats 
} from './useAdminOrders'

// Customer Orders (pedidos do cliente)
export { useCustomerOrders } from './useCustomerOrders'
export type { 
  UseCustomerOrdersOptions, 
  UseCustomerOrdersReturn 
} from './useCustomerOrders'

// Order Tracking (acompanhar pedido individual)
export { useOrderTracking } from './useOrderTracking'
export type { 
  UseOrderTrackingOptions, 
  UseOrderTrackingReturn 
} from './useOrderTracking'

// Products
export { useProducts } from './useProducts'
export type { UseProductsOptions, UseProductsReturn } from './useProducts'

// Admin Products (compatibilidade com formato legado)
export { useAdminProducts } from './useAdminProducts'
export type { LegacyProduct, UseAdminProductsReturn } from './useAdminProducts'

// Public Products (loja publica)
export { usePublicProducts } from './usePublicProducts'
export type { PublicProduct, UsePublicProductsReturn } from './usePublicProducts'

// Customer
export { useCustomer } from './useCustomer'
export type { UseCustomerReturn } from './useCustomer'

// Local Sync
export { useLocalSync, useStoreStatusSync, useOrdersSync } from './useLocalSync'
export type { UseLocalSyncOptions, UseLocalSyncReturn } from './useLocalSync'
