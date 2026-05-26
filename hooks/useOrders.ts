/**
 * @module useOrders Hook
 * @description Hook para gerenciar pedidos
 * 
 * @architecture
 * - Usa orderService internamente
 * - Gerencia lista e filtros
 * - Auto-atualiza quando pedidos mudam
 * 
 * @example
 * const { orders, pending, updateStatus, stats } = useOrders()
 * 
 * // Filtrar
 * const { orders } = useOrders({ status: 'pending' })
 * 
 * // Atualizar status
 * await updateStatus(orderId, 'confirmed')
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { orderService } from '@/lib/services'
import type { Order, OrderStatus, OrderFilters, OrderStats } from '@/types'

// =============================================================================
// HOOK
// =============================================================================

export interface UseOrdersOptions {
  filters?: OrderFilters
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseOrdersReturn {
  orders: Order[]
  isLoading: boolean
  error: string | null
  
  // Filtered lists
  pending: Order[]
  confirmed: Order[]
  preparing: Order[]
  ready: Order[]
  
  // Stats
  stats: OrderStats | null
  
  // Actions
  updateStatus: (id: string, status: OrderStatus, note?: string) => Promise<void>
  confirm: (id: string) => Promise<void>
  cancel: (id: string, reason?: string) => Promise<void>
  refresh: () => Promise<void>
  
  // Query
  getById: (id: string) => Order | undefined
  getByPhone: (phone: string) => Order[]
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const { filters, autoRefresh = false, refreshInterval = 5000 } = options
  
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Carrega pedidos
  const loadOrders = useCallback(async () => {
    try {
      const data = await orderService.getAll(filters)
      setOrders(data)
      
      const orderStats = await orderService.getStats()
      setStats(orderStats)
      
      setError(null)
    } catch (err) {
      setError('Erro ao carregar pedidos')
    } finally {
      setIsLoading(false)
    }
  }, [filters])
  
  // Carrega inicial e subscribe
  useEffect(() => {
    let mounted = true
    
    loadOrders()
    
    const unsubscribe = orderService.subscribe((newOrders) => {
      if (mounted) {
        // Aplica filtros localmente se necessario
        if (filters) {
          const filtered = applyFilters(newOrders, filters)
          setOrders(filtered)
        } else {
          setOrders(newOrders)
        }
      }
    })
    
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [filters, loadOrders])
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(loadOrders, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadOrders])
  
  // Listas filtradas
  const pending = useMemo(() => 
    orders.filter(o => o.status === 'pending'), [orders])
  
  const confirmed = useMemo(() => 
    orders.filter(o => o.status === 'confirmed'), [orders])
  
  const preparing = useMemo(() => 
    orders.filter(o => o.status === 'preparing'), [orders])
  
  const ready = useMemo(() => 
    orders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery'), [orders])
  
  // Actions
  const updateStatus = useCallback(async (id: string, status: OrderStatus, note?: string) => {
    try {
      await orderService.updateStatus(id, status, note)
    } catch (err) {
      setError('Erro ao atualizar status')
      throw err
    }
  }, [])
  
  const confirm = useCallback(async (id: string) => {
    await updateStatus(id, 'confirmed')
  }, [updateStatus])
  
  const cancel = useCallback(async (id: string, reason?: string) => {
    await updateStatus(id, 'cancelled', reason)
  }, [updateStatus])
  
  // Query helpers
  const getById = useCallback((id: string) => {
    return orders.find(o => o.id === id)
  }, [orders])
  
  const getByPhone = useCallback((phone: string) => {
    const normalized = phone.replace(/\D/g, '')
    return orders.filter(o => 
      o.customer.phone.replace(/\D/g, '').includes(normalized)
    )
  }, [orders])
  
  return {
    orders,
    isLoading,
    error,
    pending,
    confirmed,
    preparing,
    ready,
    stats,
    updateStatus,
    confirm,
    cancel,
    refresh: loadOrders,
    getById,
    getByPhone,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function applyFilters(orders: Order[], filters: OrderFilters): Order[] {
  let result = [...orders]
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    result = result.filter(o => statuses.includes(o.status))
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
