/**
 * @module Types Index
 * @description Hub central de tipos - importar tudo de @/types
 * 
 * @example
 * import type { Store, Order, Customer, Product } from '@/types'
 * import { formatCurrency, generateOrderNumber } from '@/types'
 * 
 * @architecture
 * - Todos os tipos centralizados aqui
 * - Re-exports para compatibilidade
 * - Preparado para multi-loja (storeId, tenantId)
 * - Helpers incluidos para conveniencia
 */

// =============================================================================
// COMMON
// =============================================================================

export type {
  BaseEntity,
  SoftDeletable,
  Timestamps,
  PaginationParams,
  PaginatedResponse,
  ServiceResponse,
  AsyncState,
  StorageSource,
  StorageResult,
  DeepPartial,
  OmitMultiple
} from './common'

export { generateId, now } from './common'

// =============================================================================
// STORE
// =============================================================================

export type {
  Store,
  StoreSettings,
  StoreStatus,
  StoreHours,
  DaySchedule,
  WeeklySchedule
} from './store'

export {
  DEFAULT_STORE_SETTINGS,
  isWithinBusinessHours,
  calculateStoreStatus
} from './store'

// =============================================================================
// PRODUCT
// =============================================================================

export type {
  Product,
  Category,
  ProductVariant,
  ProductAddon,
  AddonGroup,
  NutritionalInfo,
  CartItem,
  CartItemAddon,
  Cart
} from './product'

export {
  calculateCartItemTotal,
  calculateCartSubtotal,
  filterAvailableProducts,
  groupProductsByCategory
} from './product'

// =============================================================================
// ORDER
// =============================================================================

export type {
  Order,
  OrderItem,
  OrderItemAddon,
  OrderCustomer,
  OrderStatus,
  PaymentStatus,
  DeliveryType,
  PaymentMethod,
  DeliveryAddress,
  PaymentDetails,
  OrderStatusHistory,
  OrderFilters,
  OrderStats
} from './order'

export {
  generateOrderNumber,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  canCancelOrder,
  getNextOrderStatus
} from './order'

// =============================================================================
// CUSTOMER
// =============================================================================

export type {
  Customer,
  CustomerAddress,
  CustomerPreferences,
  CustomerSession,
  CustomerLoginRequest,
  CustomerLoginResponse,
  CustomerRegisterRequest,
  CustomerStats
} from './customer'

export {
  DEFAULT_CUSTOMER_PREFERENCES,
  formatPhone,
  normalizePhone,
  isValidPhone,
  createCustomerSession
} from './customer'

// =============================================================================
// PAYMENT
// =============================================================================

export type {
  PaymentConfig,
  PixConfig,
  CardConfig,
  CashConfig,
  Transaction,
  TransactionStatus,
  PixPayment
} from './payment'

export {
  formatCurrency,
  isPixExpired,
  getPixTimeRemaining,
  maskPixKey
} from './payment'

// =============================================================================
// DELIVERY
// =============================================================================

export type {
  DeliveryConfig,
  NeighborhoodFee,
  DeliveryPerson,
  DeliveryTracking,
  DeliveryTrackingStatus,
  DeliveryEvent
} from './delivery'

export {
  DEFAULT_DELIVERY_CONFIG,
  getDeliveryFeeByNeighborhood,
  getActiveNeighborhoods,
  formatDeliveryTime,
  generateDeliveryToken
} from './delivery'

// =============================================================================
// LEGACY COMPATIBILITY
// Re-exports para manter compatibilidade com imports existentes
// Remover gradualmente
// =============================================================================

// Alias para tipos antigos que podem estar em uso
export type { StoreSettings as AdminSettings } from './store'
export type { Customer as CustomerData } from './customer'
export type { CartItem as CartItemType } from './product'
