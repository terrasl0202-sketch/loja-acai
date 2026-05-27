/**
 * @module LocalStorage Adapter
 * @description Implementacao do StorageAdapter usando localStorage
 * 
 * @architecture
 * - Implementa a interface StorageAdapter
 * - Serializa/deserializa JSON automaticamente
 * - Suporta prefixos (namespaces) para multi-loja
 * - Fallback seguro para SSR
 * 
 * @migration
 * Para migrar pro Supabase, criar supabase-storage.ts
 * implementando a mesma interface StorageAdapter
 */

import type { StorageAdapter, StorageOptions, StorageEventListener, StorageEvent } from './types'

// =============================================================================
// LOCAL STORAGE ADAPTER
// =============================================================================

export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string
  private listeners: Set<StorageEventListener> = new Set()
  
  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || ''
  }
  
  /**
   * Gera chave completa com prefixo
   */
  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}${key}` : key
  }
  
  /**
   * Verifica se localStorage esta disponivel
   */
  private isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    try {
      const test = '__storage_test__'
      window.localStorage.setItem(test, test)
      window.localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Emite evento para listeners
   */
  private emit<T>(type: StorageEvent['type'], key: string, value?: T): void {
    const event: StorageEvent<T> = {
      type,
      key,
      value,
      timestamp: new Date().toISOString()
    }
    this.listeners.forEach(listener => listener(event))
  }
  
  // ---------------------------------------------------------------------------
  // INTERFACE IMPLEMENTATION
  // ---------------------------------------------------------------------------
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null
    
    try {
      const fullKey = this.getFullKey(key)
      const item = window.localStorage.getItem(fullKey)
      
      if (!item) return null
      
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`[Storage] Erro ao ler ${key}:`, error)
      return null
    }
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) return
    
    try {
      const fullKey = this.getFullKey(key)
      const serialized = JSON.stringify(value)
      
      window.localStorage.setItem(fullKey, serialized)
      this.emit('set', key, value)
    } catch (error) {
      console.error(`[Storage] Erro ao salvar ${key}:`, error)
      throw error
    }
  }
  
  async remove(key: string): Promise<void> {
    if (!this.isAvailable()) return
    
    try {
      const fullKey = this.getFullKey(key)
      window.localStorage.removeItem(fullKey)
      this.emit('remove', key)
    } catch (error) {
      console.error(`[Storage] Erro ao remover ${key}:`, error)
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false
    
    const fullKey = this.getFullKey(key)
    return window.localStorage.getItem(fullKey) !== null
  }
  
  async keys(prefix?: string): Promise<string[]> {
    if (!this.isAvailable()) return []
    
    const result: string[] = []
    const searchPrefix = this.getFullKey(prefix || '')
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(searchPrefix)) {
        // Remove o prefixo global para retornar apenas a parte relevante
        const cleanKey = this.prefix ? key.replace(this.prefix, '') : key
        result.push(cleanKey)
      }
    }
    
    return result
  }
  
  async list<T>(prefix: string): Promise<T[]> {
    const allKeys = await this.keys(prefix)
    const items: T[] = []
    
    for (const key of allKeys) {
      const item = await this.get<T>(key)
      if (item) items.push(item)
    }
    
    return items
  }
  
  async clear(prefix?: string): Promise<void> {
    if (!this.isAvailable()) return
    
    const keysToRemove = await this.keys(prefix)
    
    for (const key of keysToRemove) {
      await this.remove(key)
    }
    
    this.emit('clear', prefix || '*')
  }
  
  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------
  
  /**
   * Adiciona listener para mudancas no storage
   */
  subscribe(listener: StorageEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  /**
   * Remove todos os listeners
   */
  unsubscribeAll(): void {
    this.listeners.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Instancia padrao do LocalStorageAdapter
 * Usar esta instancia em toda a aplicacao
 */
export const localStorage = new LocalStorageAdapter()

/**
 * Cria adapter com prefixo customizado (para multi-loja)
 */
export function createLocalStorage(prefix: string): LocalStorageAdapter {
  return new LocalStorageAdapter({ prefix })
}
