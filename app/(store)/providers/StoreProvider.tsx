"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

// ============================================================
// STORE PROVIDER
// Gerencia: config da loja, estados visuais, horario de funcionamento
// FONTE UNICA DE VERDADE: localStorage (pk-store-status)
// NAO usa Vercel Blob, NAO usa valores hardcoded para status
// ============================================================

const LOCAL_KEY = 'pk-store-status'

interface StoreStatusData {
  storeOpen: boolean
  manualControl: boolean
  storeName: string
  openTime: string
  closeTime: string
  closedMessage: string
}

const DEFAULT_STATUS: StoreStatusData = {
  storeOpen: true,
  manualControl: false,
  storeName: 'Acai da Terra',
  openTime: '14:00',
  closeTime: '22:00',
  closedMessage: 'Estamos fechados no momento. Volte em breve!'
}

function loadLocalStatus(): StoreStatusData {
  if (typeof window === 'undefined') return DEFAULT_STATUS
  try {
    const saved = localStorage.getItem(LOCAL_KEY)
    if (saved) {
      return { ...DEFAULT_STATUS, ...JSON.parse(saved) }
    }
  } catch {
    // Ignora erro
  }
  return DEFAULT_STATUS
}

interface StoreContextValue {
  // Config da loja
  siteConfig: SiteConfig
  isLoading: boolean
  
  // Status da loja (FONTE UNICA: localStorage)
  storeStatus: StoreStatusData
  
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
  const [storeStatus, setStoreStatus] = useState<StoreStatusData>(DEFAULT_STATUS)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydration safe
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar config (Blob) - apenas para produtos, etc
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
  // FONTE UNICA DE VERDADE para status, horarios, nome da loja
  useEffect(() => {
    if (!isClient) return
    
    const loadStoreStatus = () => {
      const data = loadLocalStatus()
      setStoreStatus(data)
    }
    
    loadStoreStatus()
    // Atualiza a cada 2 segundos para capturar mudancas do admin IMEDIATAMENTE
    const interval = setInterval(loadStoreStatus, 2000)
    return () => clearInterval(interval)
  }, [isClient])

  // Verifica horario de funcionamento usando dados do localStorage
  const isWithinBusinessHours = useCallback(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const [openH, openM] = storeStatus.openTime.split(":").map(Number)
    const [closeH, closeM] = storeStatus.closeTime.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM
    
    // Horario normal (abre e fecha no mesmo dia)
    if (openMinutes < closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    } else {
      // Horario que cruza meia-noite
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }
  }, [storeStatus.openTime, storeStatus.closeTime])

  // Loja esta aberta = controle manual OU horario automatico
  // Se manualControl === true, usa storeOpen diretamente (IGNORA horarios)
  // Se manualControl === false, verifica horario de funcionamento
  const isStoreOpen = isClient ? (
    storeStatus.manualControl 
      ? storeStatus.storeOpen 
      : isWithinBusinessHours()
  ) : true

  // Toast global
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  const value: StoreContextValue = {
    siteConfig,
    isLoading,
    storeStatus,
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
