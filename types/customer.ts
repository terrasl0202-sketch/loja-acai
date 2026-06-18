/**
 * @module Customer Types
 * @description Tipos relacionados a clientes
 * 
 * @architecture
 * - Customer: Cliente cadastrado
 * - CustomerSession: Sessao do cliente
 * - CustomerAddress: Endereco salvo
 */

import type { BaseEntity } from './common'
import type { DeliveryAddress } from './order'

// =============================================================================
// CUSTOMER
// =============================================================================

export interface Customer extends Partial<BaseEntity> {
  id: string
  storeId?: string
  tenantId?: string
  
  // Dados basicos
  name: string
  phone: string
  email?: string
  
  // Autenticacao
  passwordHash?: string          // Nunca expor no frontend
  
  // Enderecos
  addresses: CustomerAddress[]
  defaultAddressId?: string
  
  // Fidelidade
  loyaltyPoints?: number
  totalOrders?: number
  totalSpent?: number
  
  // Status
  isActive: boolean
  isVerified?: boolean
  
  // Preferencias
  preferences?: CustomerPreferences
  
  // Marketing
  acceptsMarketing?: boolean
  
  // Timestamps
  lastOrderAt?: string
  lastLoginAt?: string
}

// =============================================================================
// CUSTOMER ADDRESS
// =============================================================================

export interface CustomerAddress extends DeliveryAddress {
  id: string
  label?: string                 // Ex: "Casa", "Trabalho"
  isDefault?: boolean
}

// =============================================================================
// CUSTOMER PREFERENCES
// =============================================================================

export interface CustomerPreferences {
  notifications: {
    email: boolean
    sms: boolean
    whatsapp: boolean
    push: boolean
  }
  defaultPaymentMethod?: string
  defaultDeliveryType?: 'delivery' | 'pickup'
}

// =============================================================================
// CUSTOMER SESSION
// =============================================================================

export interface CustomerSession {
  customerId: string
  token?: string
  phone: string
  name: string
  email?: string
  
  // Dados da sessao
  isAuthenticated: boolean
  expiresAt?: string
  
  // Cache de dados
  addresses?: CustomerAddress[]
  lastOrder?: {
    id: string
    date: string
  }
}

// =============================================================================
// CUSTOMER AUTH
// =============================================================================

export interface CustomerLoginRequest {
  phone: string
  code?: string                  // Codigo de verificacao
  password?: string              // Se usar senha
}

export interface CustomerLoginResponse {
  success: boolean
  customer?: Customer
  session?: CustomerSession
  error?: string
}

export interface CustomerRegisterRequest {
  name: string
  phone: string
  email?: string
  password?: string
  address?: DeliveryAddress
}

// =============================================================================
// CUSTOMER STATS
// =============================================================================

export interface CustomerStats {
  totalCustomers: number
  newCustomers: number           // Novos no periodo
  activeCustomers: number        // Compraram no periodo
  returningCustomers: number     // Mais de 1 compra
  averageOrdersPerCustomer: number
  averageSpentPerCustomer: number
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_CUSTOMER_PREFERENCES: CustomerPreferences = {
  notifications: {
    email: true,
    sms: false,
    whatsapp: true,
    push: true
  },
  defaultPaymentMethod: 'pix',
  defaultDeliveryType: 'delivery'
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formata telefone para exibicao
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  
  return phone
}

/**
 * Normaliza telefone para armazenamento
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

/**
 * Cria sessao do cliente
 */
export function createCustomerSession(customer: Customer): CustomerSession {
  return {
    customerId: customer.id,
    phone: customer.phone,
    name: customer.name,
    email: customer.email,
    isAuthenticated: true,
    addresses: customer.addresses
  }
}
