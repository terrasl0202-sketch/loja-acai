/**
 * @module Customer Service
 * @description Service para gerenciar clientes e autenticacao
 * 
 * @architecture
 * - Usa StorageAdapter para persistencia
 * - Gerencia sessao do cliente
 * - Preparado para autenticacao real com Supabase
 * 
 * @example
 * import { customerService } from '@/lib/services'
 * 
 * // Login por telefone
 * const session = await customerService.loginByPhone('11999999999')
 * 
 * // Obter cliente logado
 * const customer = await customerService.getCurrentCustomer()
 * 
 * // Logout
 * await customerService.logout()
 */

import { storage } from '@/lib/storage'
import type { Customer, CustomerSession, CustomerAddress } from '@/types'
import { createCustomerSession, normalizePhone } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES
// =============================================================================

type SessionListener = (session: CustomerSession | null) => void

// =============================================================================
// CUSTOMER SERVICE
// =============================================================================

class CustomerService {
  private listeners: Set<SessionListener> = new Set()
  private cachedSession: CustomerSession | null = null
  
  // ---------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // ---------------------------------------------------------------------------
  
  /**
   * Retorna sessao atual do cliente
   */
  async getSession(): Promise<CustomerSession | null> {
    try {
      const session = await storage.get<CustomerSession>(STORAGE_KEYS.CUSTOMER_SESSION)
      this.cachedSession = session
      return session
    } catch (error) {
      console.error('[CustomerService] Erro ao carregar sessao:', error)
      return null
    }
  }
  
  /**
   * Verifica se cliente esta logado
   */
  async isLoggedIn(): Promise<boolean> {
    const session = await this.getSession()
    return session?.isAuthenticated === true
  }
  
  /**
   * Retorna cliente atual (se logado)
   */
  async getCurrentCustomer(): Promise<Customer | null> {
    const session = await this.getSession()
    if (!session?.customerId) return null
    
    return this.getById(session.customerId)
  }
  
  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  
  /**
   * Login simples por telefone
   * Na versao atual, apenas cria sessao local
   * Futuro: verificacao por SMS/WhatsApp
   */
  async loginByPhone(phone: string, name?: string): Promise<CustomerSession> {
    const normalizedPhone = normalizePhone(phone)
    
    // Busca cliente existente ou cria novo
    let customer = await this.getByPhone(normalizedPhone)
    
    if (!customer) {
      customer = await this.create({
        name: name || 'Cliente',
        phone: normalizedPhone,
        addresses: [],
        isActive: true
      })
    }
    
    const session = createCustomerSession(customer)
    await this.saveSession(session)
    
    return session
  }
  
  /**
   * Salva sessao e notifica listeners
   */
  private async saveSession(session: CustomerSession | null): Promise<void> {
    if (session) {
      await storage.set(STORAGE_KEYS.CUSTOMER_SESSION, session)
    } else {
      await storage.remove(STORAGE_KEYS.CUSTOMER_SESSION)
    }
    
    this.cachedSession = session
    this.notifyListeners(session)
  }
  
  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.saveSession(null)
  }
  
  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  
  /**
   * Lista todos os clientes
   */
  async getAll(): Promise<Customer[]> {
    try {
      return await storage.get<Customer[]>(STORAGE_KEYS.CUSTOMERS) || []
    } catch (error) {
      console.error('[CustomerService] Erro ao listar clientes:', error)
      return []
    }
  }
  
  /**
   * Busca cliente por ID
   */
  async getById(id: string): Promise<Customer | null> {
    const customers = await this.getAll()
    return customers.find(c => c.id === id) || null
  }
  
  /**
   * Busca cliente por telefone
   */
  async getByPhone(phone: string): Promise<Customer | null> {
    const normalizedPhone = normalizePhone(phone)
    const customers = await this.getAll()
    return customers.find(c => normalizePhone(c.phone) === normalizedPhone) || null
  }
  
  /**
   * Cria novo cliente
   */
  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    try {
      const customers = await this.getAll()
      
      const newCustomer: Customer = {
        ...data,
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await storage.set(STORAGE_KEYS.CUSTOMERS, [...customers, newCustomer])
      
      return newCustomer
    } catch (error) {
      console.error('[CustomerService] Erro ao criar cliente:', error)
      throw error
    }
  }
  
  /**
   * Atualiza cliente
   */
  async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
    try {
      const customers = await this.getAll()
      const index = customers.findIndex(c => c.id === id)
      
      if (index === -1) return null
      
      const updated: Customer = {
        ...customers[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      customers[index] = updated
      await storage.set(STORAGE_KEYS.CUSTOMERS, customers)
      
      // Atualiza sessao se for o cliente logado
      const session = await this.getSession()
      if (session?.customerId === id) {
        await this.saveSession({
          ...session,
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          addresses: updated.addresses
        })
      }
      
      return updated
    } catch (error) {
      console.error('[CustomerService] Erro ao atualizar cliente:', error)
      throw error
    }
  }
  
  // ---------------------------------------------------------------------------
  // ADDRESS MANAGEMENT
  // ---------------------------------------------------------------------------
  
  /**
   * Adiciona endereco ao cliente
   */
  async addAddress(customerId: string, address: Omit<CustomerAddress, 'id'>): Promise<Customer | null> {
    const customer = await this.getById(customerId)
    if (!customer) return null
    
    const newAddress: CustomerAddress = {
      ...address,
      id: `addr-${Date.now()}`
    }
    
    return this.update(customerId, {
      addresses: [...customer.addresses, newAddress],
      defaultAddressId: customer.addresses.length === 0 ? newAddress.id : customer.defaultAddressId
    })
  }
  
  /**
   * Atualiza endereco
   */
  async updateAddress(customerId: string, addressId: string, data: Partial<CustomerAddress>): Promise<Customer | null> {
    const customer = await this.getById(customerId)
    if (!customer) return null
    
    const addresses = customer.addresses.map(addr => 
      addr.id === addressId ? { ...addr, ...data } : addr
    )
    
    return this.update(customerId, { addresses })
  }
  
  /**
   * Remove endereco
   */
  async removeAddress(customerId: string, addressId: string): Promise<Customer | null> {
    const customer = await this.getById(customerId)
    if (!customer) return null
    
    return this.update(customerId, {
      addresses: customer.addresses.filter(a => a.id !== addressId)
    })
  }
  
  /**
   * Define endereco padrao
   */
  async setDefaultAddress(customerId: string, addressId: string): Promise<Customer | null> {
    return this.update(customerId, { defaultAddressId: addressId })
  }
  
  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  
  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener)
    
    // Envia valor atual
    this.getSession().then(session => listener(session))
    
    return () => this.listeners.delete(listener)
  }
  
  private notifyListeners(session: CustomerSession | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(session)
      } catch (error) {
        console.error('[CustomerService] Erro em listener:', error)
      }
    })
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const customerService = new CustomerService()
