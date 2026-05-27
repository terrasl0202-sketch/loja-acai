/**
 * @module useOrderTracking Hook
 * @description Hook para acompanhar um pedido especifico
 * 
 * @architecture
 * Este hook abstrai as chamadas de API para /api/orders/public/[id]
 * mantendo compatibilidade total com o sistema atual.
 * 
 * IMPORTANTE:
 * - NAO altera as APIs existentes
 * - NAO altera o fluxo de checkout/PIX
 * - Apenas centraliza as chamadas em um hook
 * 
 * @example
 * const { order, isLoading, refresh } = useOrderTracking({ orderId: 'abc123' })
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Order } from '@/lib/config-types'

// =============================================================================
// TYPES
// =============================================================================

export interface UseOrderTrackingOptions {
  /** ID do pedido */
  orderId?: string
  /** Auto-refresh habilitado */
  autoRefresh?: boolean
  /** Intervalo de refresh em ms (default: 10000) */
  refreshInterval?: number
}

export interface UseOrderTrackingReturn {
  order: Order | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_REFRESH_INTERVAL = 10000

// =============================================================================
// HOOK
// =============================================================================

export function useOrderTracking(options: UseOrderTrackingOptions = {}): UseOrderTrackingReturn {
  const { 
    orderId, 
    autoRefresh = true, 
    refreshInterval = DEFAULT_REFRESH_INTERVAL 
  } = options
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch order by ID
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/orders/public/${orderId}`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Pedido nao encontrado')
        }
        throw new Error('Erro ao carregar pedido')
      }
      
      const data = await res.json()
      setOrder(data.order || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setOrder(null)
    } finally {
      setIsLoading(false)
    }
  }, [orderId])
  
  // Load inicial
  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId, fetchOrder])
  
  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !orderId) return
    
    const interval = setInterval(fetchOrder, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, orderId, fetchOrder])
  
  return {
    order,
    isLoading,
    error,
    refresh: fetchOrder
  }
}
