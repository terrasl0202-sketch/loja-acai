/**
 * @module useAdminOrders Hook
 * @description Hook para gerenciar pedidos no Admin
 * 
 * @architecture
 * Este hook abstrai as chamadas de API para /api/orders
 * mantendo compatibilidade total com o sistema atual.
 * 
 * IMPORTANTE:
 * - NAO altera as APIs existentes
 * - NAO altera o fluxo de checkout/PIX
 * - Apenas centraliza as chamadas em um hook
 * 
 * O storage principal continua sendo Vercel Blob via APIs.
 * Este hook serve como camada de abstracao para o Admin.
 * 
 * @example
 * const {
 *   orders,
 *   isLoading,
 *   updateStatus,
 *   updatePaymentStatus,
 *   assignEntregador,
 *   archiveOrder,
 *   refresh
 * } = useAdminOrders({ password: sessionPassword })
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Order, Entregador } from '@/lib/config-types'

// =============================================================================
// TYPES
// =============================================================================

export interface UseAdminOrdersOptions {
  /** Senha de autenticacao do admin */
  password: string
  /** Intervalo de polling em ms (default: 5000) */
  pollingInterval?: number
  /** Incluir historico de pedidos */
  includeHistory?: boolean
  /** Callback quando novos pedidos chegam */
  onNewOrders?: (count: number) => void
}

export interface UseAdminOrdersReturn {
  // Data
  orders: Order[]
  archivedOrders: Order[]
  isLoading: boolean
  error: string | null
  
  // Filtered lists (para conveniencia)
  pendingPayment: Order[]
  paidWaiting: Order[]
  preparing: Order[]
  readyForDelivery: Order[]
  delivering: Order[]
  completed: Order[]
  cancelled: Order[]
  
  // Stats
  stats: OrderStats
  
  // Actions
  updateStatus: (orderId: string, status: string) => Promise<boolean>
  updatePaymentStatus: (orderId: string, paymentStatus: string, manuallyConfirmed?: boolean) => Promise<boolean>
  assignEntregador: (orderId: string, entregador: Entregador) => Promise<boolean>
  clearEntregador: (orderId: string) => Promise<boolean>
  startDelivery: (orderId: string) => Promise<boolean>
  returnToPreparing: (orderId: string, entregador: Entregador) => Promise<boolean>
  registerDeliveryProblem: (orderId: string, observacao: string) => Promise<boolean>
  archiveOrder: (orderId: string) => Promise<boolean>
  unarchiveOrder: (orderId: string) => Promise<boolean>
  deleteOrder: (orderId: string) => Promise<boolean>
  deleteOrders: (orderIds: string[]) => Promise<boolean>
  archiveAll: () => Promise<boolean>
  cleanupDuplicates: () => Promise<boolean>
  
  // Control
  refresh: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
}

export interface OrderStats {
  total: number
  pendingPayment: number
  paidWaiting: number
  preparing: number
  readyForDelivery: number
  delivering: number
  completed: number
  cancelled: number
  archived: number
  todayRevenue: number
  todayOrders: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_POLLING_INTERVAL = 5000
const API_ENDPOINT = '/api/orders'

// =============================================================================
// HOOK
// =============================================================================

export function useAdminOrders(options: UseAdminOrdersOptions): UseAdminOrdersReturn {
  const { 
    password, 
    pollingInterval = DEFAULT_POLLING_INTERVAL, 
    includeHistory = false,
    onNewOrders 
  } = options
  
  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Refs para polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const previousOrdersRef = useRef<string[]>([])
  
  // -------------------------------------------------------------------------
  // FETCH ORDERS
  // -------------------------------------------------------------------------
  
  const fetchOrders = useCallback(async (checkForNew = false) => {
    if (!password) return
    
    try {
      const params = new URLSearchParams({
        password: encodeURIComponent(password),
        ...(includeHistory && { includeHistory: 'true' })
      })
      
      const res = await fetch(`${API_ENDPOINT}?${params}`, { 
        cache: 'no-store' 
      })
      
      if (!res.ok) {
        throw new Error('Erro ao carregar pedidos')
      }
      
      const data = await res.json()
      const allOrders: Order[] = data.orders || []
      
      // Separar ativos e arquivados
      const active = allOrders.filter((o: Order) => !o.archived)
      const archived = allOrders.filter((o: Order) => o.archived)
      
      // Verificar novos pedidos
      if (checkForNew && onNewOrders) {
        const currentIds = active.map((o: Order) => o.id)
        const newOrders = currentIds.filter(
          (id: string) => !previousOrdersRef.current.includes(id)
        )
        if (newOrders.length > 0 && previousOrdersRef.current.length > 0) {
          onNewOrders(newOrders.length)
        }
        previousOrdersRef.current = currentIds
      }
      
      setOrders(active)
      setArchivedOrders(archived)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [password, includeHistory, onNewOrders])
  
  // -------------------------------------------------------------------------
  // FILTERED LISTS
  // -------------------------------------------------------------------------
  
  const pendingPayment = useMemo(() => 
    orders.filter(o => o.paymentStatus === 'pending' && o.status !== 'cancelled'),
    [orders]
  )
  
  const paidWaiting = useMemo(() => 
    orders.filter(o => 
      o.paymentStatus === 'confirmed' && 
      o.status === 'pending'
    ),
    [orders]
  )
  
  const preparing = useMemo(() => 
    orders.filter(o => o.status === 'preparing'),
    [orders]
  )
  
  const readyForDelivery = useMemo(() => 
    orders.filter(o => o.status === 'confirmed' && o.paymentStatus === 'confirmed'),
    [orders]
  )
  
  const delivering = useMemo(() => 
    orders.filter(o => o.status === 'delivering'),
    [orders]
  )
  
  const completed = useMemo(() => 
    orders.filter(o => o.status === 'completed'),
    [orders]
  )
  
  const cancelled = useMemo(() => 
    orders.filter(o => o.status === 'cancelled'),
    [orders]
  )
  
  // -------------------------------------------------------------------------
  // STATS
  // -------------------------------------------------------------------------
  
  const stats = useMemo<OrderStats>(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayOrders = orders.filter(o => 
      o.createdAt?.startsWith(today) && 
      o.status !== 'cancelled'
    )
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    return {
      total: orders.length,
      pendingPayment: pendingPayment.length,
      paidWaiting: paidWaiting.length,
      preparing: preparing.length,
      readyForDelivery: readyForDelivery.length,
      delivering: delivering.length,
      completed: completed.length,
      cancelled: cancelled.length,
      archived: archivedOrders.length,
      todayRevenue,
      todayOrders: todayOrders.length
    }
  }, [orders, archivedOrders, pendingPayment, paidWaiting, preparing, readyForDelivery, delivering, completed, cancelled])
  
  // -------------------------------------------------------------------------
  // API ACTIONS
  // -------------------------------------------------------------------------
  
  const apiPatch = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...body })
      })
      
      if (!res.ok) return false
      
      // Refresh apos acao
      setTimeout(() => fetchOrders(), 500)
      return true
    } catch {
      return false
    }
  }, [password, fetchOrders])
  
  const apiDelete = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...body })
      })
      
      if (!res.ok) return false
      
      // Refresh apos acao
      setTimeout(() => fetchOrders(), 500)
      return true
    } catch {
      return false
    }
  }, [password, fetchOrders])
  
  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------
  
  const updateStatus = useCallback(async (orderId: string, status: string) => {
    return apiPatch({ orderId, status })
  }, [apiPatch])
  
  const updatePaymentStatus = useCallback(async (
    orderId: string, 
    paymentStatus: string, 
    manuallyConfirmed = false
  ) => {
    return apiPatch({ orderId, paymentStatus, manuallyConfirmed })
  }, [apiPatch])
  
  const assignEntregador = useCallback(async (orderId: string, entregador: Entregador) => {
    return apiPatch({ 
      orderId, 
      entregadorId: entregador.id, 
      entregadorNome: entregador.nome, 
      entregadorWhatsapp: entregador.whatsapp 
    })
  }, [apiPatch])
  
  const clearEntregador = useCallback(async (orderId: string) => {
    return apiPatch({ orderId, limparEntregador: true })
  }, [apiPatch])
  
  const startDelivery = useCallback(async (orderId: string) => {
    return apiPatch({ orderId, status: 'delivering' })
  }, [apiPatch])
  
  const returnToPreparing = useCallback(async (orderId: string, entregador: Entregador) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return false
    
    const novoHistorico = [
      ...(order.historicoEntrega || []),
      {
        entregadorId: entregador.id,
        entregadorNome: entregador.nome,
        status: 'devolvido',
        dataHora: new Date().toISOString()
      }
    ]
    
    return apiPatch({ 
      orderId, 
      status: 'preparing', 
      limparEntregador: true, 
      historicoEntrega: novoHistorico 
    })
  }, [apiPatch, orders])
  
  const registerDeliveryProblem = useCallback(async (orderId: string, observacao: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return false
    
    const novoHistorico = [
      ...(order.historicoEntrega || []),
      {
        data: new Date().toISOString(),
        evento: 'PROBLEMA',
        observacao
      }
    ]
    
    return apiPatch({ orderId, historicoEntrega: novoHistorico })
  }, [apiPatch, orders])
  
  const archiveOrder = useCallback(async (orderId: string) => {
    return apiPatch({ orderId, archived: true })
  }, [apiPatch])
  
  const unarchiveOrder = useCallback(async (orderId: string) => {
    return apiPatch({ orderId, archived: false })
  }, [apiPatch])
  
  const deleteOrder = useCallback(async (orderId: string) => {
    return apiDelete({ orderIds: [orderId] })
  }, [apiDelete])
  
  const deleteOrders = useCallback(async (orderIds: string[]) => {
    return apiDelete({ orderIds })
  }, [apiDelete])
  
  const archiveAll = useCallback(async () => {
    return apiDelete({ action: 'archive_all' })
  }, [apiDelete])
  
  const cleanupDuplicates = useCallback(async () => {
    const success = await apiDelete({ action: 'cleanup_duplicates' })
    if (success) {
      fetchOrders()
    }
    return success
  }, [apiDelete, fetchOrders])
  
  // -------------------------------------------------------------------------
  // POLLING CONTROL
  // -------------------------------------------------------------------------
  
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    
    pollingRef.current = setInterval(() => {
      fetchOrders(true) // Check for new orders
    }, pollingInterval)
  }, [fetchOrders, pollingInterval])
  
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])
  
  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------
  
  // Load inicial
  useEffect(() => {
    if (password) {
      fetchOrders()
    }
  }, [password, fetchOrders])
  
  // Cleanup
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])
  
  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------
  
  return {
    // Data
    orders,
    archivedOrders,
    isLoading,
    error,
    
    // Filtered lists
    pendingPayment,
    paidWaiting,
    preparing,
    readyForDelivery,
    delivering,
    completed,
    cancelled,
    
    // Stats
    stats,
    
    // Actions
    updateStatus,
    updatePaymentStatus,
    assignEntregador,
    clearEntregador,
    startDelivery,
    returnToPreparing,
    registerDeliveryProblem,
    archiveOrder,
    unarchiveOrder,
    deleteOrder,
    deleteOrders,
    archiveAll,
    cleanupDuplicates,
    
    // Control
    refresh: () => fetchOrders(),
    startPolling,
    stopPolling,
  }
}
