"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface StoreClosedBannerProps {
  // Props opcionais para override
  closedMessage?: string
  openTime?: string
  closeTime?: string
}

// Le dados do localStorage (mesma fonte do AdminStoreSettings)
function loadLocalStatus() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('pk-store-status')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignora erro
  }
  return null
}

export function StoreClosedBanner({ closedMessage, openTime, closeTime }: StoreClosedBannerProps) {
  const [localData, setLocalData] = useState<{
    closedMessage: string
    openTime: string
    closeTime: string
  } | null>(null)

  useEffect(() => {
    const data = loadLocalStatus()
    if (data) {
      setLocalData({
        closedMessage: data.closedMessage || 'Estamos fechados no momento. Volte em breve!',
        openTime: data.openTime || '14:00',
        closeTime: data.closeTime || '22:00'
      })
    }
  }, [])

  // Usar props se fornecidas, senao usar localStorage
  const displayMessage = closedMessage || localData?.closedMessage || 'Estamos fechados no momento.'
  const displayOpenTime = openTime || localData?.openTime || '14:00'
  const displayCloseTime = closeTime || localData?.closeTime || '22:00'

  return (
    <div className="mx-4 mt-5 p-5 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-purple-500/5 border border-orange-500/20 rounded-2xl backdrop-blur-sm shadow-xl shadow-red-500/5">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/20">
            <Clock className="w-7 h-7 text-orange-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-orange-400">
            Estamos fechados no momento
          </h3>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Voltaremos em breve
          </p>
        </div>
        {displayMessage && (
          <p className="text-sm text-muted-foreground">
            {displayMessage}
          </p>
        )}
        <div className="pt-3 border-t border-orange-500/10">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Horario de funcionamento</p>
          <p className="text-sm font-semibold text-foreground/90">
            {displayOpenTime} as {displayCloseTime}
          </p>
        </div>
      </div>
    </div>
  )
}
