"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  User, 
  ShoppingBag, 
  Gift, 
  Star, 
  ArrowLeft, 
  Loader2, 
  DollarSign,
  Clock,
  Package,
  Wallet,
  MoreVertical,
  Copy,
  MessageCircle,
  RefreshCw,
  Send,
  X,
  AlertCircle,
  Crown,
  Award,
  Medal,
  Gem,
  TrendingUp
} from "lucide-react"

interface CustomerData {
  id: number
  name: string
  phone: string
}

interface CashbackHistoryItem {
  id: number
  amount: string
  type: string
  description: string
  created_at: string
}

interface PointsHistoryItem {
  id: number
  points: number
  type: string
  description: string
  created_at: string
}

interface OrderItem {
  id: number
  orderNumber: string
  status: string
  total: number
  createdAt: string
  paymentMethod: string
  items?: string
  cashbackUsed?: number
  pointsRewardUsed?: number
}

interface ReviewData {
  orderId: number
  orderNumber: string
}

interface LoyaltyInfo {
  pointsForReward: number
  rewardValue: number
  progressToReward: number
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
}

interface VipStatus {
  level: VipLevel
  totalSpent: number
  nextLevel: VipLevel | null
  amountToNextLevel: number
  progressPercent: number
  totalOrders: number
}

export default function MinhaContaPage() {
  const params = useParams()
  const router = useRouter()
  const phone = params.phone as string

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [cashbackBalance, setCashbackBalance] = useState(0)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [cashbackHistory, setCashbackHistory] = useState<CashbackHistoryItem[]>([])
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [reviewedOrders, setReviewedOrders] = useState<number[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null)
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null)
  const [activeTab, setActiveTab] = useState<"resumo" | "pedidos" | "cashback" | "pontos" | "avaliacoes">("resumo")
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    productRating: 5,
    deliveryRating: 5,
    serviceRating: 5,
    comment: ""
  })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [repeatError, setRepeatError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const premiumRes = await fetch(`/api/premium/balance?phone=${encodeURIComponent(phone)}`)
        const premiumData = await premiumRes.json()

        if (premiumData.success && premiumData.found) {
          setCustomer(premiumData.customer)
          setCashbackBalance(premiumData.cashbackBalance)
          setPointsBalance(premiumData.pointsBalance)
          setCashbackHistory(premiumData.cashbackHistory || [])
          setPointsHistory(premiumData.pointsHistory || [])
          setLoyalty(premiumData.loyalty)
        }

        const ordersRes = await fetch(`/api/customers/orders?phone=${encodeURIComponent(phone)}`)
        const ordersData = await ordersRes.json()

        if (ordersData.success && ordersData.orders) {
          setOrders(ordersData.orders.map((o: { id: number; order_number: string; order_status: string; total: number; created_at: string; payment_method: string; items?: string }) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.order_status,
            total: o.total,
            createdAt: o.created_at,
            paymentMethod: o.payment_method,
            items: o.items
          })))
        }

        // Buscar avaliacoes do cliente para saber quais pedidos ja foram avaliados
        if (premiumData.customer?.id) {
          const reviewsRes = await fetch(`/api/reviews?customerId=${premiumData.customer.id}`)
          const reviewsData = await reviewsRes.json()
          if (reviewsData.success && reviewsData.reviews) {
            setReviewedOrders(reviewsData.reviews.map((r: { order_id: number }) => r.order_id))
          }
        }

        // Buscar status VIP do cliente
        const vipRes = await fetch(`/api/vip/customer?phone=${encodeURIComponent(phone)}`)
        const vipData = await vipRes.json()
        if (vipData.status) {
          setVipStatus(vipData.status)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [phone])

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      preparing: "Preparando",
      delivering: "Em entrega",
      completed: "Entregue",
      cancelled: "Cancelado",
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-500",
      confirmed: "text-blue-500",
      preparing: "text-purple-500",
      delivering: "text-orange-500",
      completed: "text-green-500",
      cancelled: "text-red-500",
    }
    return colors[status] || "text-muted-foreground"
  }

  const copyOrderCode = useCallback((orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber)
    setOpenMenuId(null)
  }, [])

  const sendWhatsApp = useCallback((order: OrderItem) => {
    const message = `Ola! Gostaria de informacoes sobre meu pedido #${order.orderNumber}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
    setOpenMenuId(null)
  }, [])

  const openReviewModal = useCallback((order: OrderItem) => {
    setReviewData({ orderId: order.id, orderNumber: order.orderNumber })
    setReviewForm({ rating: 5, productRating: 5, deliveryRating: 5, serviceRating: 5, comment: "" })
    setShowReviewModal(true)
    setOpenMenuId(null)
  }, [])

  const submitReview = useCallback(async () => {
    if (!reviewData || !customer) return
    setSubmittingReview(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: reviewData.orderId,
          customerId: customer.id,
          rating: reviewForm.rating,
          productRating: reviewForm.productRating,
          deliveryRating: reviewForm.deliveryRating,
          serviceRating: reviewForm.serviceRating,
          comment: reviewForm.comment || null
        })
      })
      const data = await res.json()
      if (data.success) {
        setReviewedOrders(prev => [...prev, reviewData.orderId])
        setShowReviewModal(false)
      } else {
        alert(data.error || "Erro ao enviar avaliacao")
      }
    } catch {
      alert("Erro de conexao")
    } finally {
      setSubmittingReview(false)
    }
  }, [reviewData, customer, reviewForm])

  const repeatOrder = useCallback(async (order: OrderItem) => {
    setRepeatError(null)
    try {
      // Redirecionar para a loja com os itens do pedido no localStorage
      localStorage.setItem("repeatOrder", JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber
      }))
      router.push("/?repeat=true")
    } catch {
      setRepeatError("Erro ao repetir pedido")
    }
    setOpenMenuId(null)
  }, [router])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Cliente nao encontrado</h1>
        <p className="text-muted-foreground text-center mb-4">
          Nao encontramos um cliente com este telefone
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Voltar para a loja
        </button>
      </div>
    )
  }

  const totalGasto = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : parseFloat(String(o.total))), 0)
  const completedOrders = orders.filter(o => o.status === "completed")
  const pendingReviews = completedOrders.filter(o => !reviewedOrders.includes(o.id))

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`w-8 h-8 rounded-lg transition-all ${
            star <= value ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          <Star className="w-4 h-4 mx-auto" fill={star <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar para a loja</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Cashback</span>
            </div>
            <p className="text-lg font-bold text-green-500">{formatCurrency(cashbackBalance)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Pontos</span>
            </div>
            <p className="text-lg font-bold text-purple-500">{pointsBalance}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Pedidos</span>
            </div>
            <p className="text-lg font-bold text-foreground">{orders.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground">Total Gasto</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalGasto)}</p>
          </div>
        </div>
      </div>

      {/* Pending Reviews Alert */}
      {pendingReviews.length > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <button
            onClick={() => setActiveTab("avaliacoes")}
            className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3"
          >
            <Star className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-foreground flex-1 text-left">
              Voce tem {pendingReviews.length} pedido(s) para avaliar
            </span>
            <span className="text-xs text-amber-500 font-medium">Avaliar</span>
          </button>
        </div>
      )}

      {/* Progress to Reward */}
      {loyalty && pointsBalance > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso para recompensa</span>
              <span className="text-xs text-muted-foreground">{pointsBalance}/{loyalty.pointsForReward} pontos</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${Math.min(loyalty.progressToReward, 100)}%` }}
              />
            </div>
            {loyalty.progressToReward >= 100 && (
              <p className="text-xs text-green-500 mt-2 font-medium">
                Voce tem uma recompensa de {formatCurrency(loyalty.rewardValue)} disponivel!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "resumo", label: "Resumo", icon: User },
            { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
            { id: "avaliacoes", label: "Avaliacoes", icon: Star, badge: pendingReviews.length },
            { id: "cashback", label: "Cashback", icon: Gift },
            { id: "pontos", label: "Pontos", icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        {/* Resumo */}
        {activeTab === "resumo" && (
          <div className="space-y-4">
            {/* Card VIP Premium */}
            {vipStatus && (
              <div 
                className="relative overflow-hidden rounded-xl border-2 p-5"
                style={{ 
                  borderColor: vipStatus.level.color,
                  background: `linear-gradient(135deg, ${vipStatus.level.color}15 0%, ${vipStatus.level.color}05 100%)`
                }}
              >
                {/* Header do nivel */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: vipStatus.level.color + '30' }}
                    >
                      {vipStatus.level.icon === 'medal' && <Medal className="w-6 h-6" style={{ color: vipStatus.level.color }} />}
                      {vipStatus.level.icon === 'award' && <Award className="w-6 h-6" style={{ color: vipStatus.level.color }} />}
                      {vipStatus.level.icon === 'crown' && <Crown className="w-6 h-6" style={{ color: vipStatus.level.color }} />}
                      {vipStatus.level.icon === 'gem' && <Gem className="w-6 h-6" style={{ color: vipStatus.level.color }} />}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Voce e cliente</p>
                      <h3 className="text-xl font-bold" style={{ color: vipStatus.level.color }}>
                        {vipStatus.level.name}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total gasto</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(vipStatus.totalSpent)}</p>
                  </div>
                </div>

                {/* Progresso para proximo nivel */}
                {vipStatus.nextLevel && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Proximo nivel: {vipStatus.nextLevel.name}
                      </span>
                      <span className="font-medium text-foreground">
                        Faltam {formatCurrency(vipStatus.amountToNextLevel)}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${vipStatus.progressPercent}%`,
                          backgroundColor: vipStatus.level.color
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {vipStatus.progressPercent}% completo
                    </p>
                  </div>
                )}

                {/* Beneficios do nivel */}
                {vipStatus.level.benefits && vipStatus.level.benefits.length > 0 && (
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Seus beneficios:</p>
                    <div className="flex flex-wrap gap-2">
                      {vipStatus.level.cashback_bonus_percentage > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                          <Gift className="w-3 h-3" />
                          +{vipStatus.level.cashback_bonus_percentage}% cashback
                        </span>
                      )}
                      {vipStatus.level.points_bonus_percentage > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded-full">
                          <Star className="w-3 h-3" />
                          +{vipStatus.level.points_bonus_percentage}% pontos
                        </span>
                      )}
                    </div>
                    {vipStatus.level.benefits.filter(b => !b.includes('%')).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {vipStatus.level.benefits.filter(b => !b.includes('%')).map((benefit, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Nivel maximo */}
                {!vipStatus.nextLevel && (
                  <div className="bg-background/50 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium" style={{ color: vipStatus.level.color }}>
                      Parabens! Voce atingiu o nivel maximo!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Continue comprando para aproveitar todos os beneficios
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Ultimos Pedidos
              </h3>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Pedido #{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{formatCurrency(order.total)}</p>
                        <p className={`text-xs ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pedidos */}
        {activeTab === "pedidos" && (
          <div className="space-y-3">
            {repeatError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {repeatError}
              </div>
            )}
            {orders.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Voce ainda nao fez nenhum pedido</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-card rounded-xl border border-border p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">Pedido #{order.orderNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === order.id ? null : order.id)
                          }}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenuId === order.id && (
                          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                            <button
                              onClick={() => copyOrderCode(order.orderNumber)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copiar codigo
                            </button>
                            <button
                              onClick={() => repeatOrder(order)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Repetir pedido
                            </button>
                            {order.status === "completed" && !reviewedOrders.includes(order.id) && (
                              <button
                                onClick={() => openReviewModal(order)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-amber-500"
                              >
                                <Star className="w-4 h-4" />
                                Avaliar pedido
                              </button>
                            )}
                            <button
                              onClick={() => sendWhatsApp(order)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Enviar WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
                  </div>
                  {/* Descontos Premium usados */}
                  {((order.cashbackUsed ?? 0) > 0 || (order.pointsRewardUsed ?? 0) > 0) && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      {(order.cashbackUsed ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-500 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Cashback usado
                          </span>
                          <span className="text-green-500 font-medium">-{formatCurrency(order.cashbackUsed ?? 0)}</span>
                        </div>
                      )}
                      {(order.pointsRewardUsed ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-500 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Pontos usados
                          </span>
                          <span className="text-purple-500 font-medium">-{formatCurrency(order.pointsRewardUsed ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Avaliacoes */}
        {activeTab === "avaliacoes" && (
          <div className="space-y-3">
            {pendingReviews.length > 0 && (
              <>
                <h3 className="font-semibold text-foreground">Pedidos para avaliar</h3>
                {pendingReviews.map((order) => (
                  <div key={order.id} className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Pedido #{order.orderNumber}</span>
                      <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
                    </div>
                    <button
                      onClick={() => openReviewModal(order)}
                      className="w-full mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Avaliar este pedido
                    </button>
                  </div>
                ))}
              </>
            )}
            {reviewedOrders.length > 0 && (
              <>
                <h3 className="font-semibold text-foreground mt-4">Pedidos avaliados</h3>
                <p className="text-sm text-muted-foreground">
                  Voce ja avaliou {reviewedOrders.length} pedido(s). Obrigado!
                </p>
              </>
            )}
            {pendingReviews.length === 0 && reviewedOrders.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum pedido para avaliar</p>
              </div>
            )}
          </div>
        )}

        {/* Cashback */}
        {activeTab === "cashback" && (
          <div className="space-y-3">
            <div className="bg-green-500/10 rounded-xl border border-green-500/20 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Saldo disponivel</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(cashbackBalance)}</p>
            </div>
            <h3 className="font-semibold text-foreground mt-4 mb-2">Historico</h3>
            {cashbackHistory.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum cashback ainda</p>
              </div>
            ) : (
              cashbackHistory.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span className={`font-bold ${item.type === "earned" ? "text-green-500" : "text-red-500"}`}>
                    {item.type === "earned" ? "+" : "-"}{formatCurrency(item.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pontos */}
        {activeTab === "pontos" && (
          <div className="space-y-3">
            <div className="bg-purple-500/10 rounded-xl border border-purple-500/20 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Pontos acumulados</p>
              <p className="text-2xl font-bold text-purple-500">{pointsBalance} pts</p>
            </div>
            <h3 className="font-semibold text-foreground mt-4 mb-2">Historico</h3>
            {pointsHistory.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum ponto ainda</p>
              </div>
            ) : (
              pointsHistory.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span className={`font-bold ${item.type === "earned" ? "text-purple-500" : "text-red-500"}`}>
                    {item.type === "earned" ? "+" : "-"}{item.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && reviewData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Avaliar Pedido #{reviewData.orderNumber}</h2>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nota Geral</label>
                <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Produto</label>
                <StarRating value={reviewForm.productRating} onChange={(v) => setReviewForm(f => ({ ...f, productRating: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Entrega</label>
                <StarRating value={reviewForm.deliveryRating} onChange={(v) => setReviewForm(f => ({ ...f, deliveryRating: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Atendimento</label>
                <StarRating value={reviewForm.serviceRating} onChange={(v) => setReviewForm(f => ({ ...f, serviceRating: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Comentario (opcional)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Conte como foi sua experiencia..."
                  className="w-full p-3 bg-input border border-border rounded-lg text-foreground text-sm resize-none h-24"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={submitReview}
                disabled={submittingReview}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar Avaliacao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
