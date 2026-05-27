/**
 * @module Delivery Service
 * @description Service para gerenciar entregas e taxas de bairro
 * 
 * @architecture
 * - Usa StorageAdapter para persistencia
 * - Gerencia taxas por bairro
 * - Gerencia entregadores
 * 
 * @example
 * import { deliveryService } from '@/lib/services'
 * 
 * // Listar bairros
 * const neighborhoods = await deliveryService.getNeighborhoods()
 * 
 * // Obter taxa de entrega
 * const fee = await deliveryService.getDeliveryFee('Centro')
 */

import { storage } from '@/lib/storage'
import type { NeighborhoodFee, DeliveryPerson, DeliveryConfig } from '@/types'
import { DEFAULT_DELIVERY_CONFIG, generateDeliveryToken } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// DELIVERY SERVICE
// =============================================================================

class DeliveryService {
  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------
  
  /**
   * Retorna configuracoes de entrega
   */
  async getConfig(): Promise<DeliveryConfig> {
    try {
      const config = await storage.get<DeliveryConfig>(STORAGE_KEYS.DELIVERY_CONFIG)
      return config ? { ...DEFAULT_DELIVERY_CONFIG, ...config } : DEFAULT_DELIVERY_CONFIG
    } catch (error) {
      console.error('[DeliveryService] Erro ao carregar config:', error)
      return DEFAULT_DELIVERY_CONFIG
    }
  }
  
  /**
   * Salva configuracoes de entrega
   */
  async saveConfig(config: Partial<DeliveryConfig>): Promise<DeliveryConfig> {
    const current = await this.getConfig()
    const updated = { ...current, ...config }
    await storage.set(STORAGE_KEYS.DELIVERY_CONFIG, updated)
    return updated
  }
  
  // ---------------------------------------------------------------------------
  // NEIGHBORHOODS
  // ---------------------------------------------------------------------------
  
  /**
   * Lista todos os bairros
   */
  async getNeighborhoods(): Promise<NeighborhoodFee[]> {
    try {
      return await storage.get<NeighborhoodFee[]>(STORAGE_KEYS.NEIGHBORHOODS) || []
    } catch (error) {
      console.error('[DeliveryService] Erro ao listar bairros:', error)
      return []
    }
  }
  
  /**
   * Lista bairros ativos
   */
  async getActiveNeighborhoods(): Promise<NeighborhoodFee[]> {
    const all = await this.getNeighborhoods()
    return all
      .filter(n => n.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }
  
  /**
   * Busca taxa de entrega por bairro
   */
  async getDeliveryFee(neighborhoodName: string): Promise<number> {
    const neighborhoods = await this.getNeighborhoods()
    const found = neighborhoods.find(
      n => n.name.toLowerCase() === neighborhoodName.toLowerCase() && n.isActive
    )
    
    if (found) return found.fee
    
    // Retorna taxa padrao
    const config = await this.getConfig()
    return config.defaultDeliveryFee
  }
  
  /**
   * Adiciona bairro
   */
  async addNeighborhood(data: Omit<NeighborhoodFee, 'id'>): Promise<NeighborhoodFee> {
    const neighborhoods = await this.getNeighborhoods()
    
    const newNeighborhood: NeighborhoodFee = {
      ...data,
      id: `nb-${Date.now()}`
    }
    
    await storage.set(STORAGE_KEYS.NEIGHBORHOODS, [...neighborhoods, newNeighborhood])
    return newNeighborhood
  }
  
  /**
   * Atualiza bairro
   */
  async updateNeighborhood(id: string, data: Partial<NeighborhoodFee>): Promise<NeighborhoodFee | null> {
    const neighborhoods = await this.getNeighborhoods()
    const index = neighborhoods.findIndex(n => n.id === id)
    
    if (index === -1) return null
    
    const updated = { ...neighborhoods[index], ...data }
    neighborhoods[index] = updated
    
    await storage.set(STORAGE_KEYS.NEIGHBORHOODS, neighborhoods)
    return updated
  }
  
  /**
   * Remove bairro
   */
  async removeNeighborhood(id: string): Promise<boolean> {
    const neighborhoods = await this.getNeighborhoods()
    const filtered = neighborhoods.filter(n => n.id !== id)
    
    if (filtered.length === neighborhoods.length) return false
    
    await storage.set(STORAGE_KEYS.NEIGHBORHOODS, filtered)
    return true
  }
  
  /**
   * Salva todos os bairros (bulk)
   */
  async saveNeighborhoods(neighborhoods: NeighborhoodFee[]): Promise<void> {
    await storage.set(STORAGE_KEYS.NEIGHBORHOODS, neighborhoods)
  }
  
  // ---------------------------------------------------------------------------
  // DELIVERY PERSONS
  // ---------------------------------------------------------------------------
  
  /**
   * Lista entregadores
   */
  async getDeliveryPersons(): Promise<DeliveryPerson[]> {
    try {
      return await storage.get<DeliveryPerson[]>(STORAGE_KEYS.DELIVERY_PERSONS) || []
    } catch (error) {
      console.error('[DeliveryService] Erro ao listar entregadores:', error)
      return []
    }
  }
  
  /**
   * Busca entregador por ID
   */
  async getDeliveryPersonById(id: string): Promise<DeliveryPerson | null> {
    const persons = await this.getDeliveryPersons()
    return persons.find(p => p.id === id) || null
  }
  
  /**
   * Busca entregador por token
   */
  async getDeliveryPersonByToken(token: string): Promise<DeliveryPerson | null> {
    const persons = await this.getDeliveryPersons()
    return persons.find(p => p.accessToken === token) || null
  }
  
  /**
   * Adiciona entregador
   */
  async addDeliveryPerson(data: Omit<DeliveryPerson, 'id' | 'accessToken' | 'createdAt'>): Promise<DeliveryPerson> {
    const persons = await this.getDeliveryPersons()
    
    const newPerson: DeliveryPerson = {
      ...data,
      id: `dp-${Date.now()}`,
      accessToken: generateDeliveryToken(),
      createdAt: new Date().toISOString()
    }
    
    await storage.set(STORAGE_KEYS.DELIVERY_PERSONS, [...persons, newPerson])
    return newPerson
  }
  
  /**
   * Atualiza entregador
   */
  async updateDeliveryPerson(id: string, data: Partial<DeliveryPerson>): Promise<DeliveryPerson | null> {
    const persons = await this.getDeliveryPersons()
    const index = persons.findIndex(p => p.id === id)
    
    if (index === -1) return null
    
    const updated = { ...persons[index], ...data }
    persons[index] = updated
    
    await storage.set(STORAGE_KEYS.DELIVERY_PERSONS, persons)
    return updated
  }
  
  /**
   * Remove entregador
   */
  async removeDeliveryPerson(id: string): Promise<boolean> {
    const persons = await this.getDeliveryPersons()
    const filtered = persons.filter(p => p.id !== id)
    
    if (filtered.length === persons.length) return false
    
    await storage.set(STORAGE_KEYS.DELIVERY_PERSONS, filtered)
    return true
  }
  
  /**
   * Regenera token do entregador
   */
  async regenerateToken(id: string): Promise<DeliveryPerson | null> {
    return this.updateDeliveryPerson(id, {
      accessToken: generateDeliveryToken(),
      tokenExpiresAt: undefined
    })
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const deliveryService = new DeliveryService()
