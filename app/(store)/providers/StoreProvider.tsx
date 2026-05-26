"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

// ============================================================
// STORE PROVIDER
// Gerencia: config da loja, estados visuais, horario de funcionamento
// Status da loja (aberta/fechada) vem do localStorage (pk-store-status)
// NAO usa Vercel Blob, NAO usa Supabase para status
// ============================================================

const LOCAL_KEY = 'pk-store-status'

interface StoreStatusData {
  storeOpen: boolean
  manualControl: boolean
}

function loadLocalStatus(): StoreStatusData | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(LOCAL_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignora erro
  }
  return null
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

  // Carregar status da loja do localStorage (pk-store-status)
  // NAO usa Supabase, NAO usa fetch, NAO usa Blob
  useEffect(() => {
    if (!isClient) return
    
    const loadStoreStatus = () => {
      const data = loadLocalStatus()
      if (data) {
        setStoreStatus(data)
      }
    }
    
    loadStoreStatus()
    // Atualiza a cada 5 segundos para capturar mudancas do admin
    const interval = setInterval(loadStoreStatus, 5000)
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
