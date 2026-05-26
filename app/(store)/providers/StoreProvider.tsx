"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"
import { fetchStoreOpenStatus } from "@/lib/supabase"

// ============================================================
// STORE PROVIDER
// Gerencia: config da loja, estados visuais, horario de funcionamento
// Status da loja (aberta/fechada) vem do Supabase (admin_settings)
// NAO usa Vercel Blob para status
// ============================================================

interface StoreStatusData {
  storeOpen: boolean
  manualControl: boolean
  openingTime: string
  closingTime: string
  source: 'supabase' | 'local' | 'default'
}

interface StoreContextValue {
  // Config da loja
  siteConfig: SiteConfig
  isLoading: boolean
  
  // Horario de funcionamento
  isStoreOpen: boolean
  isWithinBusinessHours: () => boolean
  
  // Toast global
  toastMessage: string | null
  showToast: (message: string) => void
  
  // Hydration safe
  isClient: boolean
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return context
}

interface StoreProviderProps {
  children: ReactNode
}

const TOAST_DURATION = 4000

export function StoreProvider({ children }: StoreProviderProps) {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultConfig)
  const [storeStatus, setStoreStatus] = useState<StoreStatusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydration safe
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar config (Blob) - apenas para produtos, horarios, etc
  // NOTA: Se o Blob falhar, usa defaultConfig sem erro
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config")
        if (response.ok) {
          const data = await response.json()
          if (data.config) {
            setSiteConfig(data.config)
          }
        }
      } catch (error) {
        console.warn("Config do Blob indisponivel, usando defaults")
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [])

  // Carregar status da loja do Supabase (admin_settings)
  useEffect(() => {
    if (!isClient) return
    
    const loadStoreStatus = async () => {
      try {
        const data = await fetchStoreOpenStatus()
        setStoreStatus(data)
      } catch (error) {
        console.error("Erro ao carregar status da loja:", error)
      }
    }
    
    loadStoreStatus()
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadStoreStatus, 30000)
    return () => clearInterval(interval)
  }, [isClient])

  // Verifica horario de funcionamento
  const isWithinBusinessHours = useCallback(() => {
    if (!siteConfig.storeHours?.openTime || !siteConfig.storeHours?.closeTime) {
      return true
    }
    
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const [openH, openM] = siteConfig.storeHours.openTime.split(":").map(Number)
    const [closeH, closeM] = siteConfig.storeHours.closeTime.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM
    
    // Horario normal (abre e fecha no mesmo dia)
    if (openMinutes < closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    } else {
      // Horario que cruza meia-noite
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }
  }, [siteConfig.storeHours])

  // Loja esta aberta = status do Supabase/localStorage + horario
  // NAO depende mais do Blob (siteConfig.storeHours?.isOpen)
  const isStoreOpen = isClient ? (
    storeStatus
      ? (storeStatus.manualControl ? storeStatus.storeOpen : isWithinBusinessHours())
      : isWithinBusinessHours() // Fallback: apenas horario automatico
  ) : true

  // Toast global
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  const value: StoreContextValue = {
    siteConfig,
    isLoading,
    isStoreOpen,
    isWithinBusinessHours,
    toastMessage,
    showToast,
    isClient,
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}
