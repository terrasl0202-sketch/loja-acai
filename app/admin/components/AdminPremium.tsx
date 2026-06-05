"use client"

import { useState, useEffect } from "react"
import { Gift, Star, Loader2, Save, Percent, DollarSign, Award, TrendingUp, MessageSquare, Eye, EyeOff, Crown, Users, Medal, Gem, MessageCircle, Edit2, Trophy, Target, Flame, Zap } from "lucide-react"

interface CashbackSettings {
  enabled: boolean
  percentage: number
  minOrderValue: number
}

interface LoyaltySettings {
  enabled: boolean
  pointsPerReal: number
  pointsForReward: number
  rewardValue: number
}

interface Review {
  id: number
  order_id: number
  rating: number
  product_rating: number | null
  delivery_rating: number | null
  service_rating: number | null
  comment: string | null
  visible: boolean
  created_at: string
  orders?: {
    order_number: string
    customer_name: string
    total: string
  }
}

interface ReviewStats {
  total: number
  averageRating: string | number
  averageProduct: string | number
  averageDelivery: string | number
  averageService: string | number
}

interface VipLevel {
  id: number
  name: string
  min_spent: number
  max_spent: number | null
  cashback_bonus_percentage: number
  points_bonus_percentage: number
  benefits: string[]
  color: string
  icon: string
  active: boolean
  sort_order: number
}

interface VipStats {
  byLevel: { level: string; count: number; color: string }[]
  topCustomers: {
    id: number
    name: string
    phone: string
    totalSpent: number
    totalOrders: number
    levelName: string
    levelColor: string
  }[]
  nearUpgrade: {
    id: number
    name: string
    phone: string
    totalSpent: number
    levelName: string
    nextLevelName: string | null
    amountToNext: number
  }[]
  totalCustomers: number
}

// Gamificacao
interface GamificationStats {
  achievementStats: {
    total: number
    active: number
    totalUnlocked: number
    uniqueCustomers: number
  }
  missionStats: {
    total: number
    active: number
    totalCompleted: number
    uniqueCustomers: number
  }
  badgeStats: {
    total: number
    active: number
    totalEarned: number
    uniqueCustomers: number
  }
  streakStats: {
    customersWithStreak: number
    maxCurrentStreak: number
    maxBestStreak: number
    avgStreak: number
  }
  topAchievements: {
    id: number
    name: string
    type: string
    unlockCount: number
  }[]
  achievements: {
    id: number
    name: string
    type: string
    target: number
    points_reward: number
    cashback_reward: number
    active: boolean
  }[]
  missions: {
    id: number
    title: string
    type: string
    target: number
    reward_type: string
    reward_value: number
    active: boolean
  }[]
  badges: {
    id: number
    name: string
    icon: string
    color: string
    active: boolean
  }[]
}

interface AdminPremiumProps {
  sessionPassword: string
}

export function AdminPremium({ sessionPassword }: AdminPremiumProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"config" | "reviews" | "vip" | "gamificacao">("config")

  const [cashback, setCashback] = useState<CashbackSettings>({
    enabled: false,
    percentage: 5,
    minOrderValue: 30,
  })

  const [loyalty, setLoyalty] = useState<LoyaltySettings>({
    enabled: false,
    pointsPerReal: 1,
    pointsForReward: 500,
    rewardValue: 10,
  })

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // VIP
  const [vipLevels, setVipLevels] = useState<VipLevel[]>([])
  const [vipStats, setVipStats] = useState<VipStats | null>(null)
  const [loadingVip, setLoadingVip] = useState(false)
  const [editingLevel, setEditingLevel] = useState<VipLevel | null>(null)
  const [savingLevel, setSavingLevel] = useState(false)

  // Gamificacao
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null)
  const [loadingGamification, setLoadingGamification] = useState(false)

  // Carregar configuracoes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/premium/settings?password=${sessionPassword}`)
        const data = await res.json()
        if (data.success) {
          if (data.cashback) {
            setCashback({
              enabled: data.cashback.enabled || false,
              percentage: parseFloat(data.cashback.percentage) || 5,
              minOrderValue: parseFloat(data.cashback.min_order_value) || 30,
            })
          }
          if (data.loyalty) {
            setLoyalty({
              enabled: data.loyalty.enabled || false,
              pointsPerReal: parseFloat(data.loyalty.points_per_real) || 1,
              pointsForReward: data.loyalty.points_for_reward || 500,
              rewardValue: parseFloat(data.loyalty.reward_value) || 10,
            })
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configuracoes premium:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionPassword])

  // Carregar avaliacoes
  useEffect(() => {
    if (activeTab === "reviews") {
      loadReviews()
    }
    if (activeTab === "vip") {
      loadVipStats()
    }
    if (activeTab === "gamificacao") {
      loadGamificationStats()
    }
  }, [activeTab, sessionPassword])

  const loadReviews = async () => {
    setLoadingReviews(true)
    try {
      const res = await fetch(`/api/reviews?password=${sessionPassword}`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.reviews || [])
        setReviewStats(data.stats || null)
      }
    } catch (error) {
      console.error("Erro ao carregar avaliacoes:", error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const toggleReviewVisibility = async (reviewId: number, visible: boolean) => {
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, reviewId, visible })
      })
      const data = await res.json()
      if (data.success) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, visible } : r))
      }
    } catch (error) {
      console.error("Erro ao atualizar avaliacao:", error)
    }
  }

  // VIP - Carregar estatisticas e niveis
  const loadVipStats = async () => {
    setLoadingVip(true)
    try {
      const res = await fetch(`/api/vip/stats?password=${sessionPassword}`)
      const data = await res.json()
      if (data.stats) {
        setVipStats(data.stats)
        setVipLevels(data.levels || [])
      }
    } catch (error) {
      console.error("Erro ao carregar VIP:", error)
    } finally {
      setLoadingVip(false)
    }
  }

  // Gamificacao - Carregar estatisticas
  const loadGamificationStats = async () => {
    setLoadingGamification(true)
    try {
      const res = await fetch(`/api/gamification/stats?password=${sessionPassword}`)
      const data = await res.json()
      if (data.achievementStats) {
        setGamificationStats(data)
      }
    } catch (error) {
      console.error("Erro ao carregar gamificacao:", error)
    } finally {
      setLoadingGamification(false)
    }
  }

  // VIP - Salvar nivel
  const handleSaveLevel = async () => {
    if (!editingLevel) return
    setSavingLevel(true)
    try {
      const res = await fetch("/api/vip/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, level: editingLevel })
      })
      const data = await res.json()
      if (data.level) {
        setVipLevels(vipLevels.map(l => l.id === data.level.id ? data.level : l))
        setEditingLevel(null)
      }
    } catch (error) {
      console.error("Erro ao salvar nivel:", error)
    } finally {
      setSavingLevel(false)
    }
  }

  // VIP - Abrir WhatsApp
  const openWhatsApp = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Ola ${name}, voce e um cliente especial da nossa loja! Temos uma condicao VIP para voce.`)
    window.open(`https://wa.me/55${phone.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  // Salvar configuracoes
  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/premium/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: sessionPassword,
          cashback,
          loyalty,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error("Erro ao salvar configuracoes premium:", error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Programa Premium
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure cashback, fidelidade e veja avaliacoes
          </p>
        </div>
        {activeTab === "config" && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saveSuccess
                ? "bg-green-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Award className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveSuccess ? "Salvo!" : "Salvar"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "config"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Gift className="w-4 h-4 inline mr-2" />
          Configuracoes
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "reviews"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Avaliacoes
          {reviewStats && reviewStats.total > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {reviewStats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("vip")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "vip"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Crown className="w-4 h-4 inline mr-2" />
          Clientes VIP
        </button>
        <button
          onClick={() => setActiveTab("gamificacao")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "gamificacao"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Gamificacao
        </button>
      </div>

      {/* Config Tab */}
      {activeTab === "config" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cashback Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Cashback</h3>
                    <p className="text-xs text-muted-foreground">Devolva parte do valor ao cliente</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cashback.enabled}
                    onChange={(e) => setCashback({ ...cashback, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className={`space-y-4 ${!cashback.enabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Percent className="w-4 h-4 inline mr-1" />
                    Porcentagem de Cashback
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={cashback.percentage}
                      onChange={(e) => setCashback({ ...cashback, percentage: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.5"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                    />
                    <span className="text-muted-foreground font-medium">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Valor Minimo do Pedido
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">R$</span>
                    <input
                      type="number"
                      value={cashback.minOrderValue}
                      onChange={(e) => setCashback({ ...cashback, minOrderValue: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="5"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fidelidade Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Fidelidade</h3>
                    <p className="text-xs text-muted-foreground">Programa de pontos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loyalty.enabled}
                    onChange={(e) => setLoyalty({ ...loyalty, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className={`space-y-4 ${!loyalty.enabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Pontos por Real Gasto
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={loyalty.pointsPerReal}
                      onChange={(e) => setLoyalty({ ...loyalty, pointsPerReal: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.5"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                    />
                    <span className="text-muted-foreground font-medium">pts/R$</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Pontos para Recompensa
                    </label>
                    <input
                      type="number"
                      value={loyalty.pointsForReward}
                      onChange={(e) => setLoyalty({ ...loyalty, pointsForReward: parseInt(e.target.value) || 0 })}
                      min="0"
                      step="50"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Valor da Recompensa
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">R$</span>
                      <input
                        type="number"
                        value={loyalty.rewardValue}
                        onChange={(e) => setLoyalty({ ...loyalty, rewardValue: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="5"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Como funciona</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Cashback e pontos sao gerados apos o pagamento ser confirmado</li>
              <li>- O mesmo pedido NUNCA gera cashback/pontos duplicados</li>
              <li>- Clientes podem usar o saldo no checkout</li>
            </ul>
          </div>
        </>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {/* Stats */}
          {reviewStats && reviewStats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">{reviewStats.averageRating}</div>
                <div className="text-xs text-muted-foreground">Media Geral</div>
                <div className="flex justify-center mt-1">{renderStars(Number(reviewStats.averageRating))}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{reviewStats.total}</div>
                <div className="text-xs text-muted-foreground">Total de Avaliacoes</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{reviewStats.averageProduct}</div>
                <div className="text-xs text-muted-foreground">Produto</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{reviewStats.averageDelivery}</div>
                <div className="text-xs text-muted-foreground">Entrega</div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma avaliacao ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`bg-card rounded-xl border border-border p-4 ${!review.visible ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium text-foreground">
                          {review.orders?.customer_name || "Cliente"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pedido #{review.orders?.order_number} - {formatDate(review.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleReviewVisibility(review.id, !review.visible)}
                      className={`p-2 rounded-lg transition-colors ${
                        review.visible
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={review.visible ? "Ocultar avaliacao" : "Mostrar avaliacao"}
                    >
                      {review.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-foreground bg-background rounded-lg p-3 mt-2">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}

                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    {review.product_rating && (
                      <span>Produto: {review.product_rating}/5</span>
                    )}
                    {review.delivery_rating && (
                      <span>Entrega: {review.delivery_rating}/5</span>
                    )}
                    {review.service_rating && (
                      <span>Atendimento: {review.service_rating}/5</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIP Tab */}
      {activeTab === "vip" && (
        <div className="space-y-6">
          {loadingVip ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats por nivel */}
              {vipStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {vipStats.byLevel.map((stat) => (
                    <div 
                      key={stat.level}
                      className="bg-card rounded-xl border-2 p-4 text-center"
                      style={{ borderColor: stat.color }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: stat.color + '20' }}
                      >
                        {stat.level === 'Bronze' && <Medal className="w-5 h-5" style={{ color: stat.color }} />}
                        {stat.level === 'Prata' && <Award className="w-5 h-5" style={{ color: stat.color }} />}
                        {stat.level === 'Ouro' && <Crown className="w-5 h-5" style={{ color: stat.color }} />}
                        {stat.level === 'Diamante' && <Gem className="w-5 h-5" style={{ color: stat.color }} />}
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                      <p className="text-sm text-muted-foreground">{stat.level}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Configurar niveis */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Configurar Niveis VIP
                </h3>
                <div className="space-y-3">
                  {vipLevels.map((level) => (
                    <div 
                      key={level.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                      style={{ borderColor: level.color + '50' }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: level.color + '20' }}
                        >
                          {level.icon === 'medal' && <Medal className="w-4 h-4" style={{ color: level.color }} />}
                          {level.icon === 'award' && <Award className="w-4 h-4" style={{ color: level.color }} />}
                          {level.icon === 'crown' && <Crown className="w-4 h-4" style={{ color: level.color }} />}
                          {level.icon === 'gem' && <Gem className="w-4 h-4" style={{ color: level.color }} />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{level.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R${level.min_spent} - {level.max_spent ? `R$${level.max_spent}` : 'ilimitado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <p className="text-green-500">+{level.cashback_bonus_percentage}% cashback</p>
                          <p className="text-purple-500">+{level.points_bonus_percentage}% pontos</p>
                        </div>
                        <button
                          onClick={() => setEditingLevel(level)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top clientes */}
              {vipStats && vipStats.topCustomers.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Top Clientes
                  </h3>
                  <div className="space-y-2">
                    {vipStats.topCustomers.slice(0, 5).map((customer, i) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.totalOrders} pedidos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              R${customer.totalSpent.toFixed(2)}
                            </p>
                            <p className="text-xs" style={{ color: customer.levelColor }}>
                              {customer.levelName}
                            </p>
                          </div>
                          <button
                            onClick={() => openWhatsApp(customer.phone, customer.name)}
                            className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proximos a subir nivel */}
              {vipStats && vipStats.nearUpgrade.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    Proximos a Subir de Nivel
                  </h3>
                  <div className="space-y-2">
                    {vipStats.nearUpgrade.map((customer) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.levelName} - Faltam R${customer.amountToNext.toFixed(2)} para {customer.nextLevelName}
                          </p>
                        </div>
                        <button
                          onClick={() => openWhatsApp(customer.phone, customer.name)}
                          className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {vipStats && vipStats.totalCustomers === 0 && (
                <div className="bg-card rounded-xl border border-border p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum cliente VIP ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Os clientes serao classificados automaticamente conforme fizerem pedidos</p>
                </div>
              )}
            </>
          )}

          {/* Modal editar nivel */}
          {editingLevel && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
                <h3 className="font-semibold text-foreground mb-4">Editar Nivel {editingLevel.name}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Valor minimo (R$)</label>
                    <input
                      type="number"
                      value={editingLevel.min_spent}
                      onChange={(e) => setEditingLevel({ ...editingLevel, min_spent: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Valor maximo (R$) - deixe vazio para ilimitado</label>
                    <input
                      type="number"
                      value={editingLevel.max_spent || ""}
                      onChange={(e) => setEditingLevel({ ...editingLevel, max_spent: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Bonus cashback (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingLevel.cashback_bonus_percentage}
                        onChange={(e) => setEditingLevel({ ...editingLevel, cashback_bonus_percentage: Number(e.target.value) })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Bonus pontos (%)</label>
                      <input
                        type="number"
                        step="1"
                        value={editingLevel.points_bonus_percentage}
                        onChange={(e) => setEditingLevel({ ...editingLevel, points_bonus_percentage: Number(e.target.value) })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setEditingLevel(null)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveLevel}
                      disabled={savingLevel}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {savingLevel ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gamificacao Tab */}
      {activeTab === "gamificacao" && (
        <div className="space-y-6">
          {loadingGamification ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : gamificationStats ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-foreground">Conquistas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{gamificationStats.achievementStats.totalUnlocked}</p>
                  <p className="text-xs text-muted-foreground">desbloqueadas por {gamificationStats.achievementStats.uniqueCustomers} clientes</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-foreground">Missoes</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{gamificationStats.missionStats.totalCompleted}</p>
                  <p className="text-xs text-muted-foreground">completadas por {gamificationStats.missionStats.uniqueCustomers} clientes</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-foreground">Badges</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{gamificationStats.badgeStats.totalEarned}</p>
                  <p className="text-xs text-muted-foreground">concedidas a {gamificationStats.badgeStats.uniqueCustomers} clientes</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-medium text-foreground">Streaks</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{gamificationStats.streakStats.customersWithStreak}</p>
                  <p className="text-xs text-muted-foreground">clientes com sequencia ativa (max: {gamificationStats.streakStats.maxBestStreak} dias)</p>
                </div>
              </div>

              {/* Top Conquistas */}
              {gamificationStats.topAchievements && gamificationStats.topAchievements.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Conquistas Mais Populares
                  </h3>
                  <div className="space-y-2">
                    {gamificationStats.topAchievements.map((achievement, index) => (
                      <div key={achievement.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground">{achievement.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{achievement.unlockCount} desbloqueios</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Conquistas */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Conquistas Cadastradas ({gamificationStats.achievements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gamificationStats.achievements.map((achievement) => (
                    <div key={achievement.id} className={`p-3 rounded-lg border ${achievement.active ? 'bg-background border-border' : 'bg-muted/50 border-muted opacity-60'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{achievement.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${achievement.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                          {achievement.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Tipo: {achievement.type} | Meta: {achievement.target}</p>
                      <p className="text-xs text-muted-foreground">
                        Recompensa: {achievement.points_reward > 0 ? `${achievement.points_reward} pts` : ''} 
                        {achievement.points_reward > 0 && achievement.cashback_reward > 0 ? ' + ' : ''}
                        {achievement.cashback_reward > 0 ? `R$ ${achievement.cashback_reward}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Missoes */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Missoes Cadastradas ({gamificationStats.missions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gamificationStats.missions.map((mission) => (
                    <div key={mission.id} className={`p-3 rounded-lg border ${mission.active ? 'bg-background border-border' : 'bg-muted/50 border-muted opacity-60'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{mission.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${mission.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                          {mission.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Tipo: {mission.type} | Meta: {mission.target}</p>
                      <p className="text-xs text-muted-foreground">
                        Recompensa: {mission.reward_type === 'points' ? `${mission.reward_value} pts` : `R$ ${mission.reward_value}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Badges */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Insignias Cadastradas ({gamificationStats.badges.length})
                </h3>
                <div className="flex flex-wrap gap-4">
                  {gamificationStats.badges.map((badge) => (
                    <div key={badge.id} className={`flex flex-col items-center p-3 rounded-lg ${badge.active ? '' : 'opacity-40'}`}>
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                        style={{ backgroundColor: badge.color + '30' }}
                      >
                        <Award className="w-6 h-6" style={{ color: badge.color }} />
                      </div>
                      <span className="text-xs font-medium text-foreground text-center">{badge.name}</span>
                      <span className={`text-[10px] ${badge.active ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {badge.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum dado de gamificacao encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
