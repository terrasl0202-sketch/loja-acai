/**
 * Servico de Pedidos (Orders)
 * 
 * Este servico gerencia a persistencia de pedidos no Supabase.
 * Inclui fallback para localStorage quando Supabase nao estiver disponivel.
 * 
 * IMPORTANTE: Este servico NAO altera a logica de checkout ou PIX.
 * Apenas adiciona persistencia opcional ao Supabase.
 * 
 * FALLBACK: Se Supabase falhar, o pedido ainda e processado normalmente.
 * O saveOrder() retorna sucesso mesmo com falha no Supabase para nao
 * interromper o fluxo de compra do usuario.
 * 
 * MIGRACAO: Para ativar persistencia no Supabase:
 * 1. Chame saveOrderToSupabase() apos criar o pedido no checkout
 * 2. Use fetchOrdersByPhone() para buscar pedidos do cliente
 * 3. O sistema continua funcionando mesmo se Supabase falhar
 */

import { createClient } from '@/lib/supabase/client'
import type { DbOrder, CreateOrderInput, UpdateOrderInput, OrderStatus } from './types'

// Chave do localStorage para fallback
const LOCAL_ORDERS_KEY = 'pk-local-orders'

export interface OrderResult {
  data: DbOrder | null
  error: string | null
  savedToSupabase: boolean
}

export interface OrdersListResult {
  data: DbOrder[]
  error: string | null
  source: 'supabase' | 'local'
}

/**
 * Salva um pedido no Supabase
 * NAO interrompe o fluxo se falhar - apenas loga o erro
 */
export async function saveOrderToSupabase(order: CreateOrderInput): Promise<OrderResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...order,
        items: order.items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Supabase] Erro ao salvar pedido:', error.message)
      // Salva localmente como fallback
      saveOrderLocally(order)
      return {
        data: null,
        error: error.message,
        savedToSupabase: false
      }
    }
    
    return {
      data: data as DbOrder,
      error: null,
      savedToSupabase: true
    }
  } catch (err) {
    console.error('[Supabase] Excecao ao salvar pedido:', err)
    saveOrderLocally(order)
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      savedToSupabase: false
    }
  }
}

/**
 * Salva pedido localmente (fallback)
 */
function saveOrderLocally(order: CreateOrderInput): void {
  try {
    const existing = localStorage.getItem(LOCAL_ORDERS_KEY)
    const orders = existing ? JSON.parse(existing) : []
    orders.unshift({
      ...order,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending'
    })
    // Mantem apenas os ultimos 50 pedidos locais
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders.slice(0, 50)))
  } catch (err) {
    console.error('[Local] Erro ao salvar pedido localmente:', err)
  }
}

/**
 * Busca pedidos por telefone do cliente
 */
export async function fetchOrdersByPhone(phone: string): Promise<OrdersListResult> {
  try {
    const supabase = createClient()
    
    // Normaliza telefone (remove caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '')
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`customer_phone.eq.${phone},customer_phone.eq.${normalizedPhone}`)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('[Supabase] Erro ao buscar pedidos:', error.message)
      return {
        data: getLocalOrders(phone),
        error: error.message,
        source: 'local'
      }
    }
    
    return {
      data: (data as DbOrder[]) || [],
      error: null,
      source: 'supabase'
    }
  } catch (err) {
    console.error('[Supabase] Excecao ao buscar pedidos:', err)
    return {
      data: getLocalOrders(phone),
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      source: 'local'
    }
  }
}

/**
 * Busca pedidos locais (fallback)
 */
function getLocalOrders(phone: string): DbOrder[] {
  try {
    const existing = localStorage.getItem(LOCAL_ORDERS_KEY)
    if (!existing) return []
    
    const orders = JSON.parse(existing)
    const normalizedPhone = phone.replace(/\D/g, '')
    
    return orders.filter((o: DbOrder) => {
      const orderPhone = o.customer_phone.replace(/\D/g, '')
      return orderPhone === normalizedPhone
    })
  } catch {
    return []
  }
}

/**
 * Busca todos os pedidos (para admin)
 */
export async function fetchAllOrders(limit = 100): Promise<OrdersListResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('[Supabase] Erro ao buscar todos pedidos:', error.message)
      return {
        data: [],
        error: error.message,
        source: 'local'
      }
    }
    
    return {
      data: (data as DbOrder[]) || [],
      error: null,
      source: 'supabase'
    }
  } catch (err) {
    console.error('[Supabase] Excecao ao buscar todos pedidos:', err)
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      source: 'local'
    }
  }
}

/**
 * Atualiza status de um pedido
 */
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (error) {
      console.error('[Supabase] Erro ao atualizar status:', error.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error('[Supabase] Excecao ao atualizar status:', err)
    return false
  }
}

/**
 * Atualiza dados de um pedido
 */
export async function updateOrder(
  orderId: string, 
  updates: UpdateOrderInput
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (error) {
      console.error('[Supabase] Erro ao atualizar pedido:', error.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error('[Supabase] Excecao ao atualizar pedido:', err)
    return false
  }
}

/**
 * Busca pedido por ID
 */
export async function fetchOrderById(orderId: string): Promise<DbOrder | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data as DbOrder
  } catch {
    return null
  }
}
