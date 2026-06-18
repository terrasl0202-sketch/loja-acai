/**
 * Customer Session Service
 * 
 * Centraliza o acesso a sessao do cliente (login, logout, dados salvos).
 * Usa o storage adapter da arquitetura SaaS para facilitar migracao futura.
 * 
 * IMPORTANTE: Este service NAO altera a logica de autenticacao.
 * Apenas abstrai o acesso ao localStorage.
 */

import { createStorage } from '@/lib/storage/storage-adapter'
import { STORAGE_KEYS } from '@/config/storage.keys'
import type { Customer } from '@/lib/config-types'

// Storage adapter
const storage = createStorage()

// Chave da sessao (compatibilidade com codigo existente)
const SESSION_KEY = STORAGE_KEYS.CUSTOMER_SESSION

/**
 * Customer Session Service
 */
export const customerSessionService = {
  /**
   * Salvar sessao do cliente (login)
   */
  async saveSession(customer: Customer): Promise<void> {
    try {
      await storage.set(SESSION_KEY, {
        ...customer,
        lastLogin: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[CustomerSession] Erro ao salvar sessao:', error)
    }
  },

  /**
   * Obter sessao do cliente
   */
  async getSession(): Promise<Customer | null> {
    try {
      return await storage.get<Customer>(SESSION_KEY)
    } catch (error) {
      console.error('[CustomerSession] Erro ao carregar sessao:', error)
      return null
    }
  },

  /**
   * Limpar sessao (logout)
   */
  async clearSession(): Promise<void> {
    try {
      await storage.remove(SESSION_KEY)
    } catch (error) {
      console.error('[CustomerSession] Erro ao limpar sessao:', error)
    }
  },

  /**
   * Verificar se esta logado
   */
  async isLoggedIn(): Promise<boolean> {
    const session = await this.getSession()
    return session !== null && !!session.id
  },

  /**
   * Obter telefone do cliente logado
   */
  async getPhone(): Promise<string | null> {
    const session = await this.getSession()
    return session?.phone ?? null
  },

  /**
   * Obter endereco salvo
   */
  async getSavedAddress(): Promise<Customer['savedAddress'] | null> {
    const session = await this.getSession()
    return session?.savedAddress ?? null
  },

  /**
   * Atualizar endereco salvo
   */
  async updateSavedAddress(address: Customer['savedAddress']): Promise<void> {
    const session = await this.getSession()
    if (session) {
      await this.saveSession({
        ...session,
        savedAddress: address,
      })
    }
  },
}

export default customerSessionService
