/**
 * @module Store Types
 * @description Tipos relacionados a loja, configuracoes e status
 * 
 * @architecture
 * - StoreSettings: Configuracoes salvas pelo admin
 * - StoreStatus: Estado atual da loja (aberta/fechada)
 * - Store: Entidade completa da loja (multi-loja)
 */

import type { BaseEntity, Timestamps } from './common'

// =============================================================================
// STORE (MULTI-LOJA)
// =============================================================================

/**
 * Entidade Store completa para sistema multi-loja
 * Preparado para SaaS com tenantId
 */
export interface Store extends BaseEntity {
  // Identificacao
  slug: string                    // URL amigavel (ex: acai-da-terra)
  name: string
  subtitle?: string
  slogan?: string
  description?: string
  
  // Contato
  whatsapp?: string
  instagram?: string
  email?: string
  phone?: string
  address?: string
  
  // Imagens
  logo?: string
  banner?: string
  favicon?: string
  
  // Status
  isActive: boolean
  isPublished: boolean
  
  // Configuracoes
  settings: StoreSettings
  
  // Metadata
  ownerId?: string               // ID do proprietario
  plan?: 'free' | 'basic' | 'premium' | 'enterprise'
}

// =============================================================================
// STORE SETTINGS
// =============================================================================

/**
 * Configuracoes da loja salvas pelo admin
 * Fonte unica de verdade para todas as configs
 */
export interface StoreSettings {
  // Identificacao
  storeName: string
  subtitle: string
  slogan: string
  
  // Status
  storeOpen: boolean
  manualControl: boolean
  
  // Horarios
  openTime: string
  closeTime: string
  closedMessage: string
  
  // Contato
  whatsapp: string
  instagram: string
  address: string
  
  // Delivery
  deliveryEnabled: boolean
  pickupEnabled: boolean
  minOrderValue: number
  
  // Pagamento
  pixEnabled: boolean
  cardEnabled: boolean
  cashEnabled: boolean
  
  // Meta
  updatedAt: string
}

/**
 * Valores padrao para StoreSettings
 * Nao contem dados fake - apenas estrutura
 */
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: '',
  subtitle: '',
  slogan: '',
  storeOpen: true,
  manualControl: false,
  openTime: '14:00',
  closeTime: '22:00',
  closedMessage: 'Estamos fechados no momento.',
  whatsapp: '',
  instagram: '',
  address: '',
  deliveryEnabled: true,
  pickupEnabled: false,
  minOrderValue: 0,
  pixEnabled: true,
  cardEnabled: false,
  cashEnabled: true,
  updatedAt: ''
}

// =============================================================================
// STORE STATUS (TEMPO REAL)
// =============================================================================

/**
 * Status da loja em tempo real
 * Calculado a partir de StoreSettings + horario atual
 */
export interface StoreStatus {
  isOpen: boolean                 // Loja aberta agora?
  isManualOverride: boolean       // Usando controle manual?
  opensAt?: string                // Proximo horario de abertura
  closesAt?: string               // Proximo horario de fechamento
  message?: string                // Mensagem atual
}

// =============================================================================
// STORE HOURS
// =============================================================================

export interface StoreHours {
  openTime: string
  closeTime: string
  isOpen?: boolean
  closedMessage?: string
}

export interface DaySchedule {
  dayOfWeek: number              // 0-6 (domingo-sabado)
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface WeeklySchedule {
  [key: string]: DaySchedule     // 'monday', 'tuesday', etc.
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Verifica se esta dentro do horario de funcionamento
 */
export function isWithinBusinessHours(
  openTime: string,
  closeTime: string,
  currentTime?: Date
): boolean {
  const now = currentTime || new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  
  // Horario normal (abre e fecha no mesmo dia)
  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  }
  
  // Horario que cruza meia-noite (ex: 18:00 - 02:00)
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes
}

/**
 * Calcula status atual da loja
 */
export function calculateStoreStatus(settings: StoreSettings): StoreStatus {
  if (settings.manualControl) {
    return {
      isOpen: settings.storeOpen,
      isManualOverride: true,
      message: settings.storeOpen ? undefined : settings.closedMessage
    }
  }
  
  const isOpen = isWithinBusinessHours(settings.openTime, settings.closeTime)
  
  return {
    isOpen,
    isManualOverride: false,
    opensAt: settings.openTime,
    closesAt: settings.closeTime,
    message: isOpen ? undefined : settings.closedMessage
  }
}
