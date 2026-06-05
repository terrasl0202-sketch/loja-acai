"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  User, 
  ShoppingBag, 
  Gift, 
  Star, 
  ArrowLeft, 
  Loader2, 
  DollarSign,
  TrendingUp,
  Clock,
  Package,
  ChevronRight,
  Wallet
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
  total: string
  createdAt: string
  paymentMethod: string
}

interface LoyaltyInfo {
  pointsForReward: number
  rewardValue: number
  progressToReward: number
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
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null)
  const [activeTab, setActiveTab] = useState<"resumo" | "pedidos" | "cashback" | "pontos">("resumo")

  useEffect(() => {
    const loadData = async () => {
      try {
        // Buscar dados premium
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

        // Buscar pedidos do cliente
        const ordersRes = await fetch(`/api/customers/orders?phone=${encodeURIComponent(phone)}`)
        const ordersData = await ordersRes.json()

        if (ordersData.success && ordersData.orders) {
          setOrders(ordersData.orders.map((o: { id: number; order_number: string; order_status: string; total: number; created_at: string; payment_method: string }) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.order_status,
            total: o.total,
            createdAt: o.created_at,
            paymentMethod: o.payment_method,
          })))
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

  const totalGasto = orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total), 0)

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

      {/* Progress to Reward */}
      {loyalty && pointsBalance > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso para recompensa</span>
              <span className="text-xs text-muted-foreground">
                {pointsBalance}/{loyalty.pointsForReward} pontos
              </span>
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
            { id: "cashback", label: "Cashback", icon: Gift },
            { id: "pontos", label: "Pontos", icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        {/* Resumo */}
        {activeTab === "resumo" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Ultimos Pedidos
              </h3>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pedido ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Pedido #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(order.total)}
                        </p>
                        <p className={`text-xs ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </p>
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
            {orders.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Voce ainda nao fez nenhum pedido</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">
                      Pedido #{order.orderNumber}
                    </span>
                    <span className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))
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
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span
                    className={`font-bold ${
                      item.type === "earned" ? "text-green-500" : "text-red-500"
                    }`}
                  >
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
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span
                    className={`font-bold ${
                      item.type === "earned" ? "text-purple-500" : "text-red-500"
                    }`}
                  >
                    {item.type === "earned" ? "+" : "-"}{item.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
