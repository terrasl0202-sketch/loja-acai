/**
 * @module useLocalSync Hook
 * @description Hook para sincronizar estado com localStorage em tempo real
 * 
 * @architecture
 * - Detecta mudancas do localStorage entre abas
 * - Util para sincronizar admin/storefront
 * - Wrapper generico para qualquer chave
 * 
 * @example
 * // Sincronizar settings entre abas
 * const { data, refresh } = useLocalSync<StoreSettings>('pk-store-status')
 * 
 * // Auto-refresh quando outra aba muda
 * useLocalSync('pk-store-status', { autoRefresh: true, interval: 2000 })
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { storage } from '@/lib/storage'

// =============================================================================
// HOOK
// =============================================================================

export interface UseLocalSyncOptions {
  autoRefresh?: boolean
  interval?: number
  onUpdate?: <T>(data: T | null) => void
}

export interface UseLocalSyncReturn<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  
  refresh: () => Promise<void>
  update: (newData: T) => Promise<void>
  remove: () => Promise<void>
}

export function useLocalSync<T>(
  key: string,
  options: UseLocalSyncOptions = {}
): UseLocalSyncReturn<T> {
  const { autoRefresh = false, interval = 2000, onUpdate } = options
  
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const lastDataRef = useRef<string | null>(null)
  
  // Carrega dados
  const loadData = useCallback(async () => {
    try {
      const stored = await storage.get<T>(key)
      const serialized = JSON.stringify(stored)
      
      // So atualiza se mudou (evita re-renders desnecessarios)
      if (serialized !== lastDataRef.current) {
        lastDataRef.current = serialized
        setData(stored)
        onUpdate?.(stored)
      }
      
      setError(null)
    } catch (err) {
      setError(`Erro ao carregar ${key}`)
    } finally {
      setIsLoading(false)
    }
  }, [key, onUpdate])
  
  // Carrega inicial
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Auto refresh por polling
  useEffect(() => {
    if (!autoRefresh) return
    
    const intervalId = setInterval(loadData, interval)
    return () => clearInterval(intervalId)
  }, [autoRefresh, interval, loadData])
  
  // Detecta mudancas de storage de outras abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        loadData()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, loadData])
  
  // Update
  const update = useCallback(async (newData: T) => {
    try {
      await storage.set(key, newData)
      setData(newData)
      lastDataRef.current = JSON.stringify(newData)
      onUpdate?.(newData)
    } catch (err) {
      setError(`Erro ao salvar ${key}`)
      throw err
    }
  }, [key, onUpdate])
  
  // Remove
  const remove = useCallback(async () => {
    try {
      await storage.remove(key)
      setData(null)
      lastDataRef.current = null
      onUpdate?.(null)
    } catch (err) {
      setError(`Erro ao remover ${key}`)
      throw err
    }
  }, [key, onUpdate])
  
  return {
    data,
    isLoading,
    error,
    refresh: loadData,
    update,
    remove,
  }
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook especifico para sincronizar status da loja entre abas
 */
export function useStoreStatusSync() {
  return useLocalSync<{
    storeOpen: boolean
    manualControl: boolean
    updatedAt: string
  }>('pk-store-status', { autoRefresh: true, interval: 2000 })
}

/**
 * Hook especifico para sincronizar pedidos entre abas
 */
export function useOrdersSync() {
  return useLocalSync<unknown[]>('pk-orders', { autoRefresh: true, interval: 3000 })
}
