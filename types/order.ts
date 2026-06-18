/**
 * @module Order Types
 * @description Tipos relacionados a pedidos
 * 
 * @architecture
 * - Order: Pedido completo
 * - OrderItem: Item do pedido
 * - OrderStatus: Estados do pedido
 */

import type { BaseEntity } from './common'
import type { Product, CartItemAddon } from './product'
import type { Customer } from './customer'

// =============================================================================
// ORDER STATUS
// =============================================================================

export type OrderStatus = 
  | 'pending'           // Aguardando confirmacao
  | 'confirmed'         // Confirmado
  | 'preparing'         // Em preparo
  | 'ready'             // Pronto para entrega/retirada
  | 'out_for_delivery'  // Saiu para entrega
  | 'delivered'         // Entregue
  | 'cancelled'         // Cancelado
  | 'refunded'          // Reembolsado

export type PaymentStatus = 
  | 'pending'           // Aguardando pagamento
  | 'paid'              // Pago
  | 'failed'            // Falhou
  | 'refunded'          // Reembolsado
  | 'partial'           // Parcialmente pago

export type DeliveryType = 'delivery' | 'pickup'

export type PaymentMethod = 'pix' | 'card' | 'cash' | 'online'

// =============================================================================
// ORDER
// =============================================================================

export interface Order extends Partial<BaseEntity> {
  id: string
  storeId?: string
  tenantId?: string
  
  // Numero do pedido (amigavel)
  orderNumber: string
  
  // Cliente
  customerId?: string
  customer: OrderCustomer
  
  // Itens
  items: OrderItem[]
  
  // Valores
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  
  // Cupom
  couponCode?: string
  couponDiscount?: number
  
  // Entrega
  deliveryType: DeliveryType
  deliveryAddress?: DeliveryAddress
  deliveryInstructions?: string
  estimatedDeliveryTime?: string
  
  // Pagamento
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentDetails?: PaymentDetails
  
  // Status
  status: OrderStatus
  statusHistory: OrderStatusHistory[]
  
  // Entregador
  deliveryPersonId?: string
  deliveryPersonName?: string
  deliveryToken?: string
  
  // Observacoes
  notes?: string
  internalNotes?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  preparedAt?: string
  deliveredAt?: string
  cancelledAt?: string
}

// =============================================================================
// ORDER ITEM
// =============================================================================

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage?: string
  
  quantity: number
  unitPrice: number
  totalPrice: number
  
  // Variante
  variant?: string
  variantName?: string
  variantPrice?: number
  
  // Adicionais
  addons: OrderItemAddon[]
  
  // Observacoes do item
  notes?: string
}

export interface OrderItemAddon {
  id: string
  name: string
  price: number
  quantity: number
}

// =============================================================================
// ORDER CUSTOMER
// =============================================================================

export interface OrderCustomer {
  id?: string
  name: string
  phone: string
  email?: string
}

// =============================================================================
// DELIVERY ADDRESS
// =============================================================================

export interface DeliveryAddress {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode?: string
  reference?: string
  
  // Coordenadas (para mapa)
  lat?: number
  lng?: number
}

// =============================================================================
// PAYMENT DETAILS
// =============================================================================

export interface PaymentDetails {
  method: PaymentMethod
  
  // PIX
  pixKey?: string
  pixQrCode?: string
  pixCopyPaste?: string
  pixExpiresAt?: string
  
  // Cartao
  cardLastFour?: string
  cardBrand?: string
  
  // Dinheiro
  cashChange?: number           // Troco para
  
  // Gateway
  gatewayId?: string
  gatewayStatus?: string
  transactionId?: string
}

// =============================================================================
// ORDER STATUS HISTORY
// =============================================================================

export interface OrderStatusHistory {
  status: OrderStatus
  timestamp: string
  note?: string
  userId?: string              // Quem alterou
}

// =============================================================================
// ORDER FILTERS
// =============================================================================

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]
  paymentStatus?: PaymentStatus
  deliveryType?: DeliveryType
  dateFrom?: string
  dateTo?: string
  customerId?: string
  search?: string
}

// =============================================================================
// ORDER STATS
// =============================================================================

export interface OrderStats {
  total: number
  pending: number
  confirmed: number
  preparing: number
  ready: number
  delivered: number
  cancelled: number
  
  revenue: number
  averageTicket: number
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gera numero de pedido amigavel
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${timestamp}-${random}`
}

/**
 * Formata status para exibicao
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
}

/**
 * Cores dos status
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'orange',
  ready: 'cyan',
  out_for_delivery: 'purple',
  delivered: 'green',
  cancelled: 'red',
  refunded: 'gray'
}

/**
 * Verifica se pedido pode ser cancelado
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return ['pending', 'confirmed'].includes(status)
}

/**
 * Proximo status do pedido
 */
export function getNextOrderStatus(current: OrderStatus): OrderStatus | null {
  const flow: Record<OrderStatus, OrderStatus | null> = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'out_for_delivery',
    out_for_delivery: 'delivered',
    delivered: null,
    cancelled: null,
    refunded: null
  }
  return flow[current]
}
