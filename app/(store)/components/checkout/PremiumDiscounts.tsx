"use client"

import { useState, useEffect } from "react"
import { Gift, Star, Check } from "lucide-react"
import { formatCurrency } from "../../utils"

interface PremiumDiscountsProps {
  orderTotal: number
  customerId?: number | null
  customerPhone?: string
  onCashbackChange: (amount: number) => void
  onPointsRewardChange: (amount: number) => void
}

interface CustomerBalance {
  cashback: number
  points: number
}

interface PremiumSettings {
  cashback: {
    enabled: boolean
    percentage: number
    minOrderValue: number
  }
  loyalty: {
    enabled: boolean
    pointsPerReal: number
    pointsForReward: number
    rewardValue: number
  }
}

export function PremiumDiscounts({
  orderTotal,
  customerId,
  customerPhone,
  onCashbackChange,
  onPointsRewardChange
}: PremiumDiscountsProps) {
  const [settings, setSettings] = useState<PremiumSettings | null>(null)
  const [balance, setBalance] = useState<CustomerBalance>({ cashback: 0, points: 0 })
  const [useCashback, setUseCashback] = useState(false)
  const [usePointsReward, setUsePointsReward] = useState(false)
  const [loading, setLoading] = useState(true)

  // Carregar settings e saldo do cliente
  useEffect(() => {
    const load = async () => {
      try {
        // Buscar configuracoes
        const settingsRes = await fetch("/api/premium/public-settings")
        const settingsData = await settingsRes.json()
        if (settingsData.success) {
          setSettings(settingsData)
        }

        // Buscar saldo se tiver telefone
        if (customerPhone) {
          const cleanPhone = customerPhone.replace(/\D/g, "")
          if (cleanPhone.length >= 10) {
            const balanceRes = await fetch(`/api/premium/balance?phone=${cleanPhone}`)
            const balanceData = await balanceRes.json()
            if (balanceData.success) {
              setBalance({
                cashback: balanceData.cashbackBalance || 0,
                points: balanceData.pointsBalance || 0
              })
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar premium:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerPhone])

  // Notificar mudancas
  useEffect(() => {
    if (useCashback && balance.cashback > 0) {
      // Cashback nao pode ser maior que o total
      const maxCashback = Math.min(balance.cashback, orderTotal * 0.5) // Max 50% do pedido
      onCashbackChange(maxCashback)
    } else {
      onCashbackChange(0)
    }
  }, [useCashback, balance.cashback, orderTotal, onCashbackChange])

  useEffect(() => {
    if (usePointsReward && settings?.loyalty.enabled) {
      const canUseReward = balance.points >= settings.loyalty.pointsForReward
      if (canUseReward) {
        onPointsRewardChange(settings.loyalty.rewardValue)
      } else {
        onPointsRewardChange(0)
      }
    } else {
      onPointsRewardChange(0)
    }
  }, [usePointsReward, balance.points, settings, onPointsRewardChange])

  if (loading || !settings) return null
  if (!settings.cashback.enabled && !settings.loyalty.enabled) return null
  if (!customerPhone) return null

  const canUseCashback = settings.cashback.enabled && balance.cashback > 0
  const canUsePointsReward = settings.loyalty.enabled && balance.points >= settings.loyalty.pointsForReward
  const maxCashback = Math.min(balance.cashback, orderTotal * 0.5)

  // Se nao tem nada para usar, nao mostrar
  if (!canUseCashback && !canUsePointsReward) return null

  return (
    <div className="premium-card rounded-2xl p-5 animate-scale-in bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
          <Gift className="w-4 h-4 text-yellow-500" />
        </div>
        Seus Beneficios
      </h3>

      <div className="space-y-3">
        {/* Cashback */}
        {canUseCashback && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 cursor-pointer hover:border-green-500/50 transition-all">
            <div className="relative">
              <input
                type="checkbox"
                checked={useCashback}
                onChange={(e) => setUseCashback(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                useCashback 
                  ? "bg-green-500 border-green-500" 
                  : "border-muted-foreground/30 bg-background"
              }`}>
                {useCashback && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-500" />
                <span className="font-medium text-foreground">Usar Cashback</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saldo disponivel: {formatCurrency(balance.cashback)}
              </p>
            </div>
            <span className="text-green-500 font-bold">
              -{formatCurrency(maxCashback)}
            </span>
          </label>
        )}

        {/* Pontos/Recompensa */}
        {canUsePointsReward && settings.loyalty.enabled && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 cursor-pointer hover:border-purple-500/50 transition-all">
            <div className="relative">
              <input
                type="checkbox"
                checked={usePointsReward}
                onChange={(e) => setUsePointsReward(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                usePointsReward 
                  ? "bg-purple-500 border-purple-500" 
                  : "border-muted-foreground/30 bg-background"
              }`}>
                {usePointsReward && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-foreground">Usar Recompensa</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {balance.points} pontos = {formatCurrency(settings.loyalty.rewardValue)} de desconto
              </p>
            </div>
            <span className="text-purple-500 font-bold">
              -{formatCurrency(settings.loyalty.rewardValue)}
            </span>
          </label>
        )}

        {/* Info do que vai ganhar */}
        {settings.cashback.enabled && orderTotal >= settings.cashback.minOrderValue && (
          <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 rounded-lg px-3 py-2 mt-2">
            <Gift className="w-3.5 h-3.5" />
            <span>Voce ganhara {formatCurrency(orderTotal * settings.cashback.percentage / 100)} de cashback neste pedido!</span>
          </div>
        )}
      </div>
    </div>
  )
}
