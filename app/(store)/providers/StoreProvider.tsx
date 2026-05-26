"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type SiteConfig, type Product, defaultConfig } from "@/lib/config-types"
import { useStoreSettings } from "@/hooks/useStoreSettings"
import { usePublicProducts } from "@/hooks/usePublicProducts"

// ============================================================
// STORE PROVIDER (MIGRADO PARA NOVA ARQUITETURA SaaS)
// Gerencia: config da loja, estados visuais, horario de funcionamento
// FONTE DE VERDADE:
//   - Status/Settings: useStoreSettings hook (storage adapter)
//   - Produtos: usePublicProducts hook (storage adapter)
//   - Outras configs: /api/config (Blob)
// ============================================================

interface StoreContextValue {
  // Config da loja (inclui produtos ja filtrados)
  siteConfig: SiteConfig
  isLoading: boolean
  
  // Produtos via nova arquitetura
  products: Product[]
  productsLoading: boolean
  
  // Status da loja (via useStoreSettings)
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
  // ============================================================
  // NOVA ARQUITETURA: Hooks centralizados
  // ============================================================
  
  // Status e configuracoes da loja via hook
  const { 
    settings: storeSettings, 
    isOpen: isStoreOpenFromHook,
    isLoading: settingsLoading 
  } = useStoreSettings()
  
  // Produtos via hook (ja filtrados: ativos e disponiveis)
  const { 
    products: productsFromHook, 
    isLoading: productsLoading 
  } = usePublicProducts()
  
  // ============================================================
  // CONFIG LEGACY (para outras configs como pagamento, delivery, etc)
  // ============================================================
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultConfig)
  const [configLoading, setConfigLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydration safe
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar config (Blob) - para pagamento, delivery, etc
  // Produtos agora vem do hook usePublicProducts
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
        setConfigLoading(false)
      }
    }
    loadConfig()
  }, [])

  // Verifica horario de funcionamento
  const isWithinBusinessHours = useCallback(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const openTime = storeSettings.openTime || '14:00'
    const closeTime = storeSettings.closeTime || '22:00'
    
    const [openH, openM] = openTime.split(":").map(Number)
    const [closeH, closeM] = closeTime.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM
    
    // Horario normal (abre e fecha no mesmo dia)
    if (openMinutes < closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    } else {
      // Horario que cruza meia-noite
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }
  }, [storeSettings.openTime, storeSettings.closeTime])

  // Status da loja: usa hook ou fallback para horario
  const isStoreOpen = isClient ? (
    storeSettings.manualControl 
      ? isStoreOpenFromHook 
      : isWithinBusinessHours()
  ) : true

  // Toast global
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  // ============================================================
  // MERGE: siteConfig com produtos do hook
  // Para manter compatibilidade com componentes que usam siteConfig.products
  // ============================================================
  const mergedConfig: SiteConfig = {
    ...siteConfig,
    // Produtos vem do hook agora (ja filtrados e ordenados)
    products: productsFromHook.length > 0 ? productsFromHook : siteConfig.products,
    // Nome da loja vem do settings
    storeName: storeSettings.storeName || siteConfig.storeName,
  }

  const isLoading = configLoading || settingsLoading

  const value: StoreContextValue = {
    siteConfig: mergedConfig,
    isLoading,
    products: productsFromHook.length > 0 ? productsFromHook : siteConfig.products.filter(p => p.active !== false && !p.outOfStock),
    productsLoading,
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
