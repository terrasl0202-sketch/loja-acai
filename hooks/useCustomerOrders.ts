/**
 * @module useCustomerOrders Hook
 * @description Hook para clientes consultarem seus pedidos
 * 
 * @architecture
 * Este hook abstrai as chamadas de API para /api/customers/orders
 * mantendo compatibilidade total com o sistema atual.
 * 
 * IMPORTANTE:
 * - NAO altera as APIs existentes
 * - NAO altera o fluxo de checkout/PIX
 * - Apenas centraliza as chamadas em um hook
 * 
 * @example
 * const { orders, isLoading, refresh } = useCustomerOrders({ phone: '11999999999' })
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Order } from '@/lib/config-types'

// =============================================================================
// TYPES
// =============================================================================

export interface UseCustomerOrdersOptions {
  /** Telefone do cliente */
  phone?: string
  /** Auto-refresh habilitado */
  autoRefresh?: boolean
  /** Intervalo de refresh em ms (default: 30000) */
  refreshInterval?: number
}

export interface UseCustomerOrdersReturn {
  orders: Order[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_REFRESH_INTERVAL = 30000
const API_ENDPOINT = '/api/customers/orders'

// =============================================================================
// HOOK
// =============================================================================

export function useCustomerOrders(options: UseCustomerOrdersOptions = {}): UseCustomerOrdersReturn {
  const { 
    phone, 
    autoRefresh = false, 
    refreshInterval = DEFAULT_REFRESH_INTERVAL 
  } = options
  
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch orders by phone
  const fetchOrders = useCallback(async () => {
    if (!phone) {
      setOrders([])
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_ENDPOINT}?phone=${encodeURIComponent(phone)}`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        throw new Error('Erro ao carregar pedidos')
      }
      
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [phone])
  
  // Load inicial
  useEffect(() => {
    if (phone) {
      fetchOrders()
    }
  }, [phone, fetchOrders])
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !phone) return
    
    const interval = setInterval(fetchOrders, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, phone, fetchOrders])
  
  return {
    orders,
    isLoading,
    error,
    refresh: fetchOrders
  }
}
