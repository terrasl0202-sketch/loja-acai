"use client"

import { useEffect, useState } from "react"
import { Gift, Star } from "lucide-react"

interface PremiumSettings {
  cashback: {
    enabled: boolean
    percentage: number
    minOrderValue: number
  }
  loyalty: {
    enabled: boolean
    pointsPerReal: number
  }
}

interface RewardsPreviewProps {
  orderTotal: number
}

export function RewardsPreview({ orderTotal }: RewardsPreviewProps) {
  const [settings, setSettings] = useState<PremiumSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Buscar configuracoes publicas (sem autenticacao)
        const res = await fetch("/api/premium/public-settings")
        const data = await res.json()
        if (data.success) {
          setSettings(data)
        }
      } catch (error) {
        console.error("Erro ao carregar settings premium:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !settings) return null

  const { cashback, loyalty } = settings
  
  // Calcular cashback previsto
  const cashbackAmount = cashback.enabled && orderTotal >= cashback.minOrderValue
    ? (orderTotal * cashback.percentage / 100)
    : 0
  
  // Calcular pontos previstos
  const pointsAmount = loyalty.enabled
    ? Math.floor(orderTotal * loyalty.pointsPerReal)
    : 0

  // Se nenhum beneficio, nao mostrar
  if (cashbackAmount === 0 && pointsAmount === 0) return null

  return (
    <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 rounded-xl border border-green-500/20 p-3 mt-4">
      <p className="text-xs font-medium text-foreground mb-2">
        Ao finalizar este pedido voce ganhara:
      </p>
      <div className="flex flex-wrap gap-3">
        {cashbackAmount > 0 && (
          <div className="flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-green-500">
              R$ {cashbackAmount.toFixed(2)} de cashback
            </span>
          </div>
        )}
        {pointsAmount > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-500">
              {pointsAmount} pontos
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
