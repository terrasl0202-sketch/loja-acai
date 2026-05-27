/**
 * @module useCustomer Hook
 * @description Hook para gerenciar sessao do cliente
 * 
 * @architecture
 * - Usa customerService internamente
 * - Gerencia autenticacao do cliente
 * - Auto-atualiza quando sessao muda
 * 
 * @example
 * const { customer, isLoggedIn, login, logout } = useCustomer()
 * 
 * // Login
 * await login('11999999999', 'Nome')
 * 
 * // Logout
 * await logout()
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { customerService } from '@/lib/services'
import type { Customer, CustomerSession, CustomerAddress } from '@/types'

// =============================================================================
// HOOK
// =============================================================================

export interface UseCustomerReturn {
  customer: Customer | null
  session: CustomerSession | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (phone: string, name?: string) => Promise<CustomerSession>
  logout: () => Promise<void>
  updateProfile: (data: Partial<Customer>) => Promise<void>
  
  // Address management
  addAddress: (address: Omit<CustomerAddress, 'id'>) => Promise<void>
  updateAddress: (addressId: string, data: Partial<CustomerAddress>) => Promise<void>
  removeAddress: (addressId: string) => Promise<void>
  setDefaultAddress: (addressId: string) => Promise<void>
  
  refresh: () => Promise<void>
}

export function useCustomer(): UseCustomerReturn {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Carrega sessao inicial
  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      try {
        const currentSession = await customerService.getSession()
        if (mounted) {
          setSession(currentSession)
          
          if (currentSession?.customerId) {
            const currentCustomer = await customerService.getCurrentCustomer()
            setCustomer(currentCustomer)
          }
          
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError('Erro ao carregar sessao')
          setIsLoading(false)
        }
      }
    }
    
    load()
    
    // Subscribe para mudancas na sessao
    const unsubscribe = customerService.subscribe((newSession) => {
      if (mounted) {
        setSession(newSession)
        
        if (!newSession) {
          setCustomer(null)
        }
      }
    })
    
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])
  
  // Login
  const login = useCallback(async (phone: string, name?: string) => {
    try {
      setError(null)
      const newSession = await customerService.loginByPhone(phone, name)
      setSession(newSession)
      
      const currentCustomer = await customerService.getCurrentCustomer()
      setCustomer(currentCustomer)
      
      return newSession
    } catch (err) {
      setError('Erro ao fazer login')
      throw err
    }
  }, [])
  
  // Logout
  const logout = useCallback(async () => {
    try {
      await customerService.logout()
      setSession(null)
      setCustomer(null)
    } catch (err) {
      setError('Erro ao fazer logout')
      throw err
    }
  }, [])
  
  // Update profile
  const updateProfile = useCallback(async (data: Partial<Customer>) => {
    if (!customer?.id) throw new Error('Nenhum cliente logado')
    
    try {
      const updated = await customerService.update(customer.id, data)
      if (updated) setCustomer(updated)
    } catch (err) {
      setError('Erro ao atualizar perfil')
      throw err
    }
  }, [customer?.id])
  
  // Address management
  const addAddress = useCallback(async (address: Omit<CustomerAddress, 'id'>) => {
    if (!customer?.id) throw new Error('Nenhum cliente logado')
    
    try {
      const updated = await customerService.addAddress(customer.id, address)
      if (updated) setCustomer(updated)
    } catch (err) {
      setError('Erro ao adicionar endereco')
      throw err
    }
  }, [customer?.id])
  
  const updateAddress = useCallback(async (addressId: string, data: Partial<CustomerAddress>) => {
    if (!customer?.id) throw new Error('Nenhum cliente logado')
    
    try {
      const updated = await customerService.updateAddress(customer.id, addressId, data)
      if (updated) setCustomer(updated)
    } catch (err) {
      setError('Erro ao atualizar endereco')
      throw err
    }
  }, [customer?.id])
  
  const removeAddress = useCallback(async (addressId: string) => {
    if (!customer?.id) throw new Error('Nenhum cliente logado')
    
    try {
      const updated = await customerService.removeAddress(customer.id, addressId)
      if (updated) setCustomer(updated)
    } catch (err) {
      setError('Erro ao remover endereco')
      throw err
    }
  }, [customer?.id])
  
  const setDefaultAddress = useCallback(async (addressId: string) => {
    if (!customer?.id) throw new Error('Nenhum cliente logado')
    
    try {
      const updated = await customerService.setDefaultAddress(customer.id, addressId)
      if (updated) setCustomer(updated)
    } catch (err) {
      setError('Erro ao definir endereco padrao')
      throw err
    }
  }, [customer?.id])
  
  // Refresh
  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentSession = await customerService.getSession()
      setSession(currentSession)
      
      if (currentSession?.customerId) {
        const currentCustomer = await customerService.getCurrentCustomer()
        setCustomer(currentCustomer)
      }
    } catch (err) {
      setError('Erro ao recarregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return {
    customer,
    session,
    isLoggedIn: !!session?.isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    refresh,
  }
}
