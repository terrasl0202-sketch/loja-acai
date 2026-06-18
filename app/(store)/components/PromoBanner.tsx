"use client"

import { useState, useEffect } from "react"
import { X, Truck, Tag, Gift, Percent, Sparkles } from "lucide-react"

interface PromoBannerProps {
  message?: string
  icon?: string
  enabled?: boolean
}

// Mapeia icones
const ICONS: Record<string, typeof Truck> = {
  truck: Truck,
  tag: Tag,
  gift: Gift,
  percent: Percent,
  sparkles: Sparkles,
}

export function PromoBanner({ message, icon = "truck", enabled = true }: PromoBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Verificar localStorage no cliente
  useEffect(() => {
    setIsClient(true)
    const stored = localStorage.getItem('promo-banner-dismissed')
    if (stored === 'true') {
      setDismissed(true)
    }
  }, [])
  
  // Salvar no localStorage quando fechar
  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('promo-banner-dismissed', 'true')
  }
  
  // Nao mostra se nao habilitado, sem mensagem, fechado ou ainda carregando no servidor
  if (!enabled || !message || dismissed || !isClient) {
    return null
  }
  
  const IconComponent = ICONS[icon] || Truck
  
  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <IconComponent className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors flex-shrink-0"
          aria-label="Fechar banner promocional"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
