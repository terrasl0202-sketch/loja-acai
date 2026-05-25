"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

// ============================================================
// STORE PROVIDER
// Gerencia: config da loja, estados visuais, horario de funcionamento
// NAO gerencia: PIX, checkout, pedidos, APIs
// ============================================================

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
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydration safe
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config")
        if (response.ok) {
          const data = await response.json()
          setSiteConfig(data)
        }
      } catch (error) {
        console.error("Erro ao carregar config:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [])

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

  // Loja esta aberta = status manual E dentro do horario
  const isStoreOpen = isClient ? (siteConfig.storeHours?.isOpen && isWithinBusinessHours()) : true

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
