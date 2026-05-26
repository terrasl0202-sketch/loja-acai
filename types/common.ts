/**
 * @module Common Types
 * @description Tipos utilitarios compartilhados em todo o projeto
 * 
 * @architecture
 * - Base para todos os outros tipos
 * - Preparado para multi-loja com storeId/tenantId
 * - Timestamps padronizados
 */

// =============================================================================
// IDENTIFICADORES BASE
// =============================================================================

/**
 * Identificador unico universal
 * Preparado para multi-loja SaaS
 */
export interface BaseEntity {
  id: string
  storeId?: string      // ID da loja (multi-loja)
  tenantId?: string     // ID do tenant (SaaS)
  createdAt: string
  updatedAt: string
}

/**
 * Entidade com soft delete
 */
export interface SoftDeletable {
  deletedAt?: string | null
  isDeleted?: boolean
}

// =============================================================================
// TIMESTAMPS
// =============================================================================

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

// =============================================================================
// PAGINACAO
// =============================================================================

export interface PaginationParams {
  page: number
  limit: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

// =============================================================================
// RESPONSE PATTERNS
// =============================================================================

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// =============================================================================
// STORAGE
// =============================================================================

export type StorageSource = 'localStorage' | 'supabase' | 'api' | 'default'

export interface StorageResult<T> {
  data: T
  source: StorageSource
  timestamp?: string
}

// =============================================================================
// UTILS
// =============================================================================

/**
 * Faz todas as propriedades opcionais recursivamente
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Omite propriedades de um tipo
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * ID gerador simples
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Timestamp ISO atual
 */
export const now = (): string => new Date().toISOString()
