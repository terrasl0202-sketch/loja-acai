/**
 * @module AppProvider
 * @description Provider global que inicializa e disponibiliza services
 * 
 * @architecture
 * - Inicializa services na montagem
 * - Disponibiliza hooks para acesso aos dados
 * - Gerencia polling/sincronizacao
 * - Preparado para multi-loja
 * 
 * @example
 * // No layout.tsx
 * <AppProvider>
 *   {children}
 * </AppProvider>
 * 
 * // Em componentes
 * const { settings, isOpen } = useAppContext()
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { storeService } from '@/lib/services/store-service'
import type { StoreSettings, StoreStatus } from '@/types'
import { DEFAULT_STORE_SETTINGS, calculateStoreStatus } from '@/types'
import { migrateLegacyKeys } from '@/config/storage.keys'

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface AppContextValue {
  // Store
  settings: StoreSettings
  status: StoreStatus
  isOpen: boolean
  isLoading: boolean
  
  // Actions
  updateSettings: (partial: Partial<StoreSettings>) => Promise<void>
  setStoreOpen: (open: boolean) => Promise<void>
  refreshSettings: () => Promise<void>
  
  // Multi-loja (futuro)
  storeId?: string
  tenantId?: string
}

const AppContext = createContext<AppContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface AppProviderProps {
  children: ReactNode
  storeId?: string        // Para multi-loja
  tenantId?: string       // Para multi-tenant
  enablePolling?: boolean // Habilita polling automatico
  pollingInterval?: number
}

export function AppProvider({
  children,
  storeId,
  tenantId,
  enablePolling = true,
  pollingInterval = 2000
}: AppProviderProps) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  
  // Calcula status em tempo real
  const status = calculateStoreStatus(settings)
  
  // Inicializa e carrega settings
  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      // Migra chaves antigas (uma vez)
      await migrateLegacyKeys()
      
      // Carrega settings
      const data = await storeService.getSettings()
      if (mounted) {
        setSettings(data)
        setIsLoading(false)
      }
    }
    
    init()
    
    // Subscribe para mudancas
    const unsubscribe = storeService.subscribe((newSettings) => {
      if (mounted) {
        setSettings(newSettings)
      }
    })
    
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])
  
  // Polling para sincronizacao entre abas
  useEffect(() => {
    if (!enablePolling) return
    
    storeService.startPolling(pollingInterval)
    
    return () => {
      storeService.stopPolling()
    }
  }, [enablePolling, pollingInterval])
  
  // Actions
  const updateSettings = useCallback(async (partial: Partial<StoreSettings>) => {
    const updated = await storeService.saveSettings(partial)
    setSettings(updated)
  }, [])
  
  const setStoreOpen = useCallback(async (open: boolean) => {
    await storeService.setOpen(open)
  }, [])
  
  const refreshSettings = useCallback(async () => {
    setIsLoading(true)
    const data = await storeService.getSettings()
    setSettings(data)
    setIsLoading(false)
  }, [])
  
  const value: AppContextValue = {
    settings,
    status,
    isOpen: status.isOpen,
    isLoading,
    updateSettings,
    setStoreOpen,
    refreshSettings,
    storeId,
    tenantId
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook para acessar o contexto global da aplicacao
 * 
 * @example
 * const { settings, isOpen, updateSettings } = useAppContext()
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  
  if (!context) {
    throw new Error('useAppContext deve ser usado dentro de AppProvider')
  }
  
  return context
}

/**
 * Hook opcional que retorna null se fora do provider
 * Util para componentes que podem ser usados fora do provider
 */
export function useAppContextOptional(): AppContextValue | null {
  return useContext(AppContext)
}
