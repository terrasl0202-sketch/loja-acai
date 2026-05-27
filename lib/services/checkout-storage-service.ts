/**
 * Checkout Storage Service
 * 
 * Centraliza o acesso ao storage do checkout (pedido em andamento, carrinho, etc.)
 * Usa o storage adapter da arquitetura SaaS para facilitar migracao futura.
 * 
 * IMPORTANTE: Este service NAO altera a logica de pagamento PIX/Asaas.
 * Apenas abstrai o acesso ao localStorage.
 */

import { createStorage } from '@/lib/storage/storage-adapter'
import { STORAGE_KEYS } from '@/config/storage.keys'
import type { PixData } from '@/app/(store)/types'

// Storage adapter para checkout
const storage = createStorage()

// Chaves do checkout (compatibilidade com codigo existente)
const ORDER_KEY = STORAGE_KEYS.PENDING_ORDER
const CART_KEY = STORAGE_KEYS.CART

/**
 * Tipos do checkout storage
 */
export interface CheckoutState {
  orderId: string
  pixData: PixData | null
  orderSnapshot: unknown | null
  pixCooldownEnd: number | null
  createdAt: string
  lastUpdated: string
}

export interface CartState {
  quantities: Record<number, number>
  lastUpdated: string
}

/**
 * Checkout Storage Service
 */
export const checkoutStorageService = {
  /**
   * Salvar estado do pedido em andamento
   */
  async saveOrderState(state: Partial<CheckoutState>): Promise<void> {
    try {
      const existing = await this.getOrderState()
      const updated: CheckoutState = {
        orderId: state.orderId ?? existing?.orderId ?? '',
        pixData: state.pixData ?? existing?.pixData ?? null,
        orderSnapshot: state.orderSnapshot ?? existing?.orderSnapshot ?? null,
        pixCooldownEnd: state.pixCooldownEnd ?? existing?.pixCooldownEnd ?? null,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }
      await storage.set(ORDER_KEY, updated)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao salvar estado:', error)
    }
  },

  /**
   * Obter estado do pedido em andamento
   */
  async getOrderState(): Promise<CheckoutState | null> {
    try {
      return await storage.get<CheckoutState>(ORDER_KEY)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao carregar estado:', error)
      return null
    }
  },

  /**
   * Limpar estado do pedido (novo pedido)
   */
  async clearOrderState(): Promise<void> {
    try {
      await storage.remove(ORDER_KEY)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao limpar estado:', error)
    }
  },

  /**
   * Verificar se existe pedido em andamento
   */
  async hasPendingOrder(): Promise<boolean> {
    const state = await this.getOrderState()
    return state !== null && state.orderId !== ''
  },

  /**
   * Salvar carrinho
   */
  async saveCart(quantities: Record<number, number>): Promise<void> {
    try {
      const state: CartState = {
        quantities,
        lastUpdated: new Date().toISOString(),
      }
      await storage.set(CART_KEY, state)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao salvar carrinho:', error)
    }
  },

  /**
   * Obter carrinho
   */
  async getCart(): Promise<CartState | null> {
    try {
      return await storage.get<CartState>(CART_KEY)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao carregar carrinho:', error)
      return null
    }
  },

  /**
   * Limpar carrinho
   */
  async clearCart(): Promise<void> {
    try {
      await storage.remove(CART_KEY)
    } catch (error) {
      console.error('[CheckoutStorage] Erro ao limpar carrinho:', error)
    }
  },

  /**
   * Obter dados PIX do pedido atual
   * Retorna null se nao houver pedido ou PIX
   */
  async getPixData(): Promise<PixData | null> {
    const state = await this.getOrderState()
    return state?.pixData ?? null
  },

  /**
   * Verificar se esta em cooldown do PIX
   */
  async isInPixCooldown(): Promise<boolean> {
    const state = await this.getOrderState()
    if (!state?.pixCooldownEnd) return false
    return Date.now() < state.pixCooldownEnd
  },

  /**
   * Obter tempo restante do cooldown em ms
   */
  async getPixCooldownRemaining(): Promise<number> {
    const state = await this.getOrderState()
    if (!state?.pixCooldownEnd) return 0
    const remaining = state.pixCooldownEnd - Date.now()
    return remaining > 0 ? remaining : 0
  },
}

export default checkoutStorageService
