"use client"

import { useState, useEffect } from "react"
import { Gift, Star, Loader2, Save, Percent, DollarSign, Award, TrendingUp, MessageSquare, Eye, EyeOff } from "lucide-react"

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

interface AdminPremiumProps {
  sessionPassword: string
}

export function AdminPremium({ sessionPassword }: AdminPremiumProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"config" | "reviews">("config")

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
    </div>
  )
}
