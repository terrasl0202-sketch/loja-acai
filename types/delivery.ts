/**
 * @module Delivery Types
 * @description Tipos relacionados a entrega e bairros
 * 
 * @architecture
 * - DeliveryConfig: Configuracoes de entrega
 * - NeighborhoodFee: Taxa por bairro
 * - DeliveryPerson: Entregador
 */

// =============================================================================
// DELIVERY CONFIG
// =============================================================================

export interface DeliveryConfig {
  // Tipos habilitados
  deliveryEnabled: boolean
  pickupEnabled: boolean
  
  // Valores
  defaultDeliveryFee: number
  freeDeliveryMinimum?: number   // Entrega gratis acima de X
  
  // Tempo estimado
  estimatedTimeMin: number        // Em minutos
  estimatedTimeMax: number
  
  // Area de entrega
  deliveryRadius?: number         // Em km
  neighborhoods?: NeighborhoodFee[]
  
  // Restricoes
  minOrderValue: number
  maxDistance?: number
  
  // Retirada
  pickupAddress?: string
  pickupInstructions?: string
}

// =============================================================================
// NEIGHBORHOOD FEE
// =============================================================================

export interface NeighborhoodFee {
  id: string
  storeId?: string
  
  name: string
  fee: number
  
  isActive: boolean
  estimatedTime?: number          // Tempo adicional em minutos
  
  // Zona/Regiao
  zone?: string
  
  // Ordem de exibicao
  sortOrder?: number
}

// =============================================================================
// DELIVERY PERSON
// =============================================================================

export interface DeliveryPerson {
  id: string
  storeId?: string
  
  name: string
  phone: string
  
  // Status
  isActive: boolean
  isAvailable: boolean
  
  // Veiculo
  vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'walking'
  vehiclePlate?: string
  
  // Token de acesso
  accessToken?: string
  tokenExpiresAt?: string
  
  // Stats
  totalDeliveries?: number
  rating?: number
  
  // Timestamps
  createdAt: string
  lastActiveAt?: string
}

// =============================================================================
// DELIVERY TRACKING
// =============================================================================

export interface DeliveryTracking {
  orderId: string
  deliveryPersonId: string
  
  status: DeliveryTrackingStatus
  
  // Localizacao
  currentLocation?: {
    lat: number
    lng: number
    updatedAt: string
  }
  
  // Eventos
  events: DeliveryEvent[]
  
  // Tempos
  assignedAt: string
  pickedUpAt?: string
  deliveredAt?: string
  
  // Estimativa
  estimatedArrival?: string
}

export type DeliveryTrackingStatus = 
  | 'assigned'          // Atribuido ao entregador
  | 'picked_up'         // Retirado na loja
  | 'on_the_way'        // A caminho
  | 'arrived'           // Chegou no destino
  | 'delivered'         // Entregue
  | 'failed'            // Falha na entrega

export interface DeliveryEvent {
  status: DeliveryTrackingStatus
  timestamp: string
  note?: string
  location?: {
    lat: number
    lng: number
  }
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  deliveryEnabled: true,
  pickupEnabled: false,
  defaultDeliveryFee: 5,
  estimatedTimeMin: 30,
  estimatedTimeMax: 50,
  minOrderValue: 0,
  neighborhoods: []
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Encontra taxa de entrega por bairro
 */
export function getDeliveryFeeByNeighborhood(
  neighborhoods: NeighborhoodFee[],
  neighborhoodName: string
): number | null {
  const found = neighborhoods.find(
    n => n.name.toLowerCase() === neighborhoodName.toLowerCase() && n.isActive
  )
  return found ? found.fee : null
}

/**
 * Lista bairros ativos ordenados
 */
export function getActiveNeighborhoods(
  neighborhoods: NeighborhoodFee[]
): NeighborhoodFee[] {
  return neighborhoods
    .filter(n => n.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}

/**
 * Formata tempo de entrega
 */
export function formatDeliveryTime(min: number, max: number): string {
  return `${min}-${max} min`
}

/**
 * Gera token de acesso para entregador
 */
export function generateDeliveryToken(): string {
  return `DEL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase()
}
