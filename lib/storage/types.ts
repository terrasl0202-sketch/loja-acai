/**
 * @module Storage Types
 * @description Tipos para a camada de storage abstrata
 * 
 * @architecture
 * - Interface StorageAdapter abstrai localStorage/Supabase
 * - Hoje: localStorage
 * - Futuro: trocar para Supabase sem mudar os services
 */

// =============================================================================
// STORAGE ADAPTER INTERFACE
// =============================================================================

/**
 * Interface abstrata de storage
 * Implementada por localStorage hoje, Supabase no futuro
 */
export interface StorageAdapter {
  /**
   * Busca um item pelo chave
   */
  get<T>(key: string): Promise<T | null>
  
  /**
   * Salva um item
   */
  set<T>(key: string, value: T): Promise<void>
  
  /**
   * Remove um item
   */
  remove(key: string): Promise<void>
  
  /**
   * Verifica se uma chave existe
   */
  exists(key: string): Promise<boolean>
  
  /**
   * Lista todas as chaves com um prefixo
   */
  keys(prefix?: string): Promise<string[]>
  
  /**
   * Busca multiplos itens por prefixo
   */
  list<T>(prefix: string): Promise<T[]>
  
  /**
   * Limpa todas as chaves com um prefixo
   */
  clear(prefix?: string): Promise<void>
}

// =============================================================================
// STORAGE OPTIONS
// =============================================================================

export interface StorageOptions {
  /**
   * Prefixo para todas as chaves (namespace)
   * Ex: 'store:123:' para multi-loja
   */
  prefix?: string
  
  /**
   * TTL padrao em segundos (para cache)
   */
  defaultTTL?: number
  
  /**
   * Serializer customizado
   */
  serialize?: <T>(value: T) => string
  deserialize?: <T>(value: string) => T
}

// =============================================================================
// STORAGE RESULT
// =============================================================================

export interface StorageResult<T> {
  data: T | null
  source: 'localStorage' | 'supabase' | 'cache' | 'default'
  timestamp?: string
  ttl?: number
}

// =============================================================================
// STORAGE EVENTS
// =============================================================================

export type StorageEventType = 'set' | 'remove' | 'clear'

export interface StorageEvent<T = unknown> {
  type: StorageEventType
  key: string
  value?: T
  timestamp: string
}

export type StorageEventListener = <T>(event: StorageEvent<T>) => void

// =============================================================================
// STORAGE METADATA
// =============================================================================

export interface StorageMetadata {
  key: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
  size?: number
}
