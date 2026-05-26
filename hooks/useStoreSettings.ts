/**
 * @module useStoreSettings Hook
 * @description Hook para acessar configuracoes da loja
 * 
 * @architecture
 * - Usa storeService internamente
 * - Gerencia estado e loading
 * - Auto-atualiza quando settings mudam
 * 
 * @example
 * const { settings, isLoading, updateSettings, isOpen } = useStoreSettings()
 * 
 * // Atualizar
 * await updateSettings({ storeName: 'Nova Loja' })
 * 
 * // Verificar status
 * if (isOpen) { ... }
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { storeService } from '@/lib/services'
import type { StoreSettings, StoreStatus } from '@/types'
import { DEFAULT_STORE_SETTINGS, calculateStoreStatus } from '@/types'

// =============================================================================
// HOOK
// =============================================================================

export interface UseStoreSettingsReturn {
  settings: StoreSettings
  status: StoreStatus
  isLoading: boolean
  error: string | null
  
  // Status helpers
  isOpen: boolean
  isManualControl: boolean
  
  // Actions
  updateSettings: (partial: Partial<StoreSettings>) => Promise<void>
  setOpen: (isOpen: boolean) => Promise<void>
  useAutomaticSchedule: () => Promise<void>
  refresh: () => Promise<void>
}

export function useStoreSettings(): UseStoreSettingsReturn {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Calcula status em tempo real
  const status = calculateStoreStatus(settings)
  
  // Carrega settings inicial
  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      try {
        const data = await storeService.getSettings()
        if (mounted) {
          setSettings(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError('Erro ao carregar configuracoes')
          setIsLoading(false)
        }
      }
    }
    
    load()
    
    // Inscreve para mudancas
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
  
  // Atualiza settings
  const updateSettings = useCallback(async (partial: Partial<StoreSettings>) => {
    try {
      setError(null)
      const updated = await storeService.saveSettings(partial)
      setSettings(updated)
    } catch (err) {
      setError('Erro ao salvar configuracoes')
      throw err
    }
  }, [])
  
  // Abre/fecha loja
  const setOpen = useCallback(async (isOpen: boolean) => {
    try {
      await storeService.setOpen(isOpen)
    } catch (err) {
      setError('Erro ao alterar status da loja')
      throw err
    }
  }, [])
  
  // Usa horario automatico
  const useAutomaticSchedule = useCallback(async () => {
    try {
      await storeService.useAutomaticSchedule()
    } catch (err) {
      setError('Erro ao configurar horario automatico')
      throw err
    }
  }, [])
  
  // Recarrega
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await storeService.getSettings()
      setSettings(data)
    } catch (err) {
      setError('Erro ao recarregar configuracoes')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return {
    settings,
    status,
    isLoading,
    error,
    isOpen: status.isOpen,
    isManualControl: settings.manualControl,
    updateSettings,
    setOpen,
    useAutomaticSchedule,
    refresh,
  }
}
