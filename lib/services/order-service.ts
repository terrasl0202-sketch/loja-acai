/**
 * @module Order Service
 * @description Service para gerenciar pedidos
 * 
 * @architecture
 * - Usa StorageAdapter para persistencia
 * - CRUD completo de pedidos
 * - Gerenciamento de status
 * - Preparado para multi-loja com storeId
 * 
 * @example
 * import { orderService } from '@/lib/services'
 * 
 * // Listar pedidos
 * const orders = await orderService.getAll()
 * 
 * // Criar pedido
 * const newOrder = await orderService.create(orderData)
 * 
 * // Atualizar status
 * await orderService.updateStatus(orderId, 'preparing')
 */

import { storage } from '@/lib/storage'
import type { Order, OrderStatus, OrderFilters, OrderStats } from '@/types'
import { generateOrderNumber, ORDER_STATUS_LABELS } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES
// =============================================================================

type OrderListener = (orders: Order[]) => void

// =============================================================================
// ORDER SERVICE
// =============================================================================

class OrderService {
  private listeners: Set<OrderListener> = new Set()
  private cachedOrders: Order[] | null = null
  
  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  
  /**
   * Lista todos os pedidos
   */
  async getAll(filters?: OrderFilters): Promise<Order[]> {
    try {
      const orders = await storage.get<Order[]>(STORAGE_KEYS.ORDERS) || []
      
      this.cachedOrders = orders
      
      if (!filters) return orders
      
      return this.applyFilters(orders, filters)
    } catch (error) {
      console.error('[OrderService] Erro ao listar pedidos:', error)
      return []
    }
  }
  
  /**
   * Busca pedido por ID
   */
  async getById(id: string): Promise<Order | null> {
    const orders = await this.getAll()
    return orders.find(o => o.id === id) || null
  }
  
  /**
   * Busca pedido por numero
   */
  async getByOrderNumber(orderNumber: string): Promise<Order | null> {
    const orders = await this.getAll()
    return orders.find(o => o.orderNumber === orderNumber) || null
  }
  
  /**
   * Cria novo pedido
   */
  async create(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Promise<Order> {
    try {
      const orders = await this.getAll()
      
      const newOrder: Order = {
        ...orderData,
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderNumber: generateOrderNumber(),
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: new Date().toISOString()
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updated = [newOrder, ...orders]
      await storage.set(STORAGE_KEYS.ORDERS, updated)
      
      this.cachedOrders = updated
      this.notifyListeners(updated)
      
      return newOrder
    } catch (error) {
      console.error('[OrderService] Erro ao criar pedido:', error)
      throw error
    }
  }
  
  /**
   * Atualiza pedido
   */
  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    try {
      const orders = await this.getAll()
      const index = orders.findIndex(o => o.id === id)
      
      if (index === -1) return null
      
      const updated: Order = {
        ...orders[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      orders[index] = updated
      await storage.set(STORAGE_KEYS.ORDERS, orders)
      
      this.cachedOrders = orders
      this.notifyListeners(orders)
      
      return updated
    } catch (error) {
      console.error('[OrderService] Erro ao atualizar pedido:', error)
      throw error
    }
  }
  
  /**
   * Remove pedido
   */
  async delete(id: string): Promise<boolean> {
    try {
      const orders = await this.getAll()
      const filtered = orders.filter(o => o.id !== id)
      
      if (filtered.length === orders.length) return false
      
      await storage.set(STORAGE_KEYS.ORDERS, filtered)
      
      this.cachedOrders = filtered
      this.notifyListeners(filtered)
      
      return true
    } catch (error) {
      console.error('[OrderService] Erro ao deletar pedido:', error)
      return false
    }
  }
  
  // ---------------------------------------------------------------------------
  // STATUS MANAGEMENT
  // ---------------------------------------------------------------------------
  
  /**
   * Atualiza status do pedido
   */
  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order | null> {
    const order = await this.getById(id)
    if (!order) return null
    
    const statusEntry = {
      status,
      timestamp: new Date().toISOString(),
      note
    }
    
    return this.update(id, {
      status,
      statusHistory: [...(order.statusHistory || []), statusEntry],
      ...(status === 'confirmed' && { confirmedAt: new Date().toISOString() }),
      ...(status === 'delivered' && { deliveredAt: new Date().toISOString() }),
      ...(status === 'cancelled' && { cancelledAt: new Date().toISOString() })
    })
  }
  
  /**
   * Confirma pedido
   */
  async confirm(id: string): Promise<Order | null> {
    return this.updateStatus(id, 'confirmed')
  }
  
  /**
   * Cancela pedido
   */
  async cancel(id: string, reason?: string): Promise<Order | null> {
    return this.updateStatus(id, 'cancelled', reason)
  }
  
  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------
  
  /**
   * Busca pedidos por status
   */
  async getByStatus(status: OrderStatus | OrderStatus[]): Promise<Order[]> {
    const statuses = Array.isArray(status) ? status : [status]
    return this.getAll({ status: statuses as OrderStatus[] })
  }
  
  /**
   * Busca pedidos pendentes
   */
  async getPending(): Promise<Order[]> {
    return this.getByStatus('pending')
  }
  
  /**
   * Busca pedidos do cliente
   */
  async getByCustomer(customerId: string): Promise<Order[]> {
    return this.getAll({ customerId })
  }
  
  /**
   * Busca pedidos por telefone
   */
  async getByPhone(phone: string): Promise<Order[]> {
    const orders = await this.getAll()
    const normalizedPhone = phone.replace(/\D/g, '')
    return orders.filter(o => 
      o.customer.phone.replace(/\D/g, '') === normalizedPhone
    )
  }
  
  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  
  /**
   * Retorna estatisticas dos pedidos
   */
  async getStats(): Promise<OrderStats> {
    const orders = await this.getAll()
    
    const byStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<OrderStatus, number>)
    
    const revenue = orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + o.total, 0)
    
    const completedOrders = orders.filter(o => o.status === 'delivered')
    
    return {
      total: orders.length,
      pending: byStatus['pending'] || 0,
      confirmed: byStatus['confirmed'] || 0,
      preparing: byStatus['preparing'] || 0,
      ready: byStatus['ready'] || 0,
      delivered: byStatus['delivered'] || 0,
      cancelled: byStatus['cancelled'] || 0,
      revenue,
      averageTicket: completedOrders.length > 0 
        ? revenue / completedOrders.length 
        : 0
    }
  }
  
  // ---------------------------------------------------------------------------
  // FILTERS
  // ---------------------------------------------------------------------------
  
  private applyFilters(orders: Order[], filters: OrderFilters): Order[] {
    let result = [...orders]
    
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      result = result.filter(o => statuses.includes(o.status))
    }
    
    if (filters.paymentStatus) {
      result = result.filter(o => o.paymentStatus === filters.paymentStatus)
    }
    
    if (filters.deliveryType) {
      result = result.filter(o => o.deliveryType === filters.deliveryType)
    }
    
    if (filters.customerId) {
      result = result.filter(o => o.customerId === filters.customerId)
    }
    
    if (filters.dateFrom) {
      result = result.filter(o => o.createdAt >= filters.dateFrom!)
    }
    
    if (filters.dateTo) {
      result = result.filter(o => o.createdAt <= filters.dateTo!)
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(search) ||
        o.customer.name.toLowerCase().includes(search) ||
        o.customer.phone.includes(search)
      )
    }
    
    return result
  }
  
  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  
  subscribe(listener: OrderListener): () => void {
    this.listeners.add(listener)
    
    if (this.cachedOrders) {
      listener(this.cachedOrders)
    } else {
      this.getAll().then(orders => listener(orders))
    }
    
    return () => this.listeners.delete(listener)
  }
  
  private notifyListeners(orders: Order[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(orders)
      } catch (error) {
        console.error('[OrderService] Erro em listener:', error)
      }
    })
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const orderService = new OrderService()
