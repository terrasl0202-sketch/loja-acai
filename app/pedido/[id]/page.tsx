"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package, CreditCard, ChefHat, Truck, CheckCircle2, Clock, MapPin, ShoppingBag, Phone, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PublicOrder {
  id: string
  customerName: string
  items: string
  itemsDetailed?: { productName: string; quantity: number; price: number; subtotal: number }[]
  total: number
  paymentMethod: string
  deliveryType: string
  neighborhood?: string
  status: "pending" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled"
  paymentStatus: "pending" | "confirmed" | "failed"
  createdAt: string
  confirmedAt?: string
  saiuParaEntregaEm?: string
  entregadorNome?: string
}

const statusSteps = [
  { key: "pending", label: "Pedido Recebido", icon: Package },
  { key: "confirmed", label: "Pagamento Confirmado", icon: CreditCard },
  { key: "preparing", label: "Em Preparo", icon: ChefHat },
  { key: "delivering", label: "Saiu para Entrega", icon: Truck },
  { key: "completed", label: "Entregue", icon: CheckCircle2 },
]

const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  confirmed: "text-blue-400",
  preparing: "text-orange-400",
  delivering: "text-purple-400",
  completed: "text-emerald-400",
  cancelled: "text-red-400",
}

const statusLabels: Record<string, string> = {
  pending: "Aguardando Pagamento",
  confirmed: "Pagamento Confirmado",
  preparing: "Em Preparo",
  delivering: "Saiu para Entrega",
  completed: "Entregue",
  cancelled: "Cancelado",
}

export default function PedidoPage() {
  const params = useParams()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchOrder = async () => {
    try {
      console.log("[v0] Buscando pedido:", orderId)
      const res = await fetch(`/api/orders/public/${orderId}`)
      const data = await res.json()
      console.log("[v0] Resposta:", data)
      
      if (data.success && data.order) {
        setOrder(data.order)
        setError(null)
      } else {
        console.log("[v0] Erro:", data.error)
        setError("Pedido nao encontrado")
      }
    } catch (err) {
      console.log("[v0] Erro fetch:", err)
      setError("Erro ao carregar pedido")
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrder()
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(fetchOrder, 30000)
      return () => clearInterval(interval)
    }
  }, [orderId])

  const getCurrentStepIndex = () => {
    if (!order) return 0
    if (order.status === "cancelled") return -1
    
    // Para status pending, verificar se pagamento foi confirmado
    if (order.status === "pending" && order.paymentStatus === "confirmed") {
      return 1 // Pagamento confirmado
    }
    
    return statusSteps.findIndex(s => s.key === order.status)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-xl font-bold text-foreground mb-2">Pedido nao encontrado</h1>
          <p className="text-muted-foreground mb-6">O pedido {orderId} nao foi encontrado ou ja foi removido do sistema.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:brightness-110 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Loja
          </Link>
        </div>
      </div>
    )
  }

  const currentStep = getCurrentStepIndex()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Voltar</span>
            </Link>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pedido</p>
              <p className="font-bold text-primary">{order.id}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              order.status === "cancelled" 
                ? "bg-red-500/20 text-red-400"
                : order.status === "completed"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-primary/20 text-primary"
            }`}>
              {statusLabels[order.status]}
  </div>
  {lastUpdate && (
    <p className="text-muted-foreground text-sm mt-2">
      Ultima atualizacao: {formatTime(lastUpdate.toISOString())}
    </p>
  )}
  </div>

          {/* Progress Steps */}
          {order.status !== "cancelled" && (
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border"></div>
              <div 
                className="absolute left-6 top-6 w-0.5 bg-primary transition-all duration-500"
                style={{ height: `${Math.max(0, currentStep) * 25}%` }}
              ></div>

              {/* Steps */}
              <div className="space-y-6">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = index <= currentStep
                  const isCurrent = index === currentStep
                  
                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? isCurrent 
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/30" 
                            : "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {/* Info adicional para etapas completadas */}
                        {step.key === "pending" && order.createdAt && (
                          <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                        )}
                        {step.key === "confirmed" && order.confirmedAt && isActive && (
                          <p className="text-xs text-muted-foreground">{formatTime(order.confirmedAt)}</p>
                        )}
                        {step.key === "delivering" && order.saiuParaEntregaEm && isActive && (
                          <p className="text-xs text-muted-foreground">
                            Saiu as {formatTime(order.saiuParaEntregaEm)}
                            {order.entregadorNome && ` com ${order.entregadorNome}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cancelled Status */}
          {order.status === "cancelled" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-medium">Este pedido foi cancelado</p>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Detalhes do Pedido
          </h2>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">{order.customerName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{order.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {order.deliveryType === "entrega" ? "Entrega" : "Retirada"}
                  {order.neighborhood && ` - ${order.neighborhood}`}
                </p>
              </div>
            </div>

            {/* Itens */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Itens</p>
              {order.itemsDetailed && order.itemsDetailed.length > 0 ? (
                <div className="space-y-2">
                  {order.itemsDetailed.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.quantity}x {item.productName}</span>
                      <span className="text-muted-foreground">R$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-line">{order.items}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <span className="font-medium text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">R$ {order.total.toFixed(2)}</span>
            </div>

            {/* Info adicional */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <p className="text-sm text-foreground">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horario do Pedido</p>
                <p className="text-sm text-foreground">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Atualizacao automatica a cada 30 segundos</p>
          <button 
            onClick={fetchOrder}
            className="text-primary text-sm font-medium hover:underline"
          >
            Atualizar agora
          </button>
        </div>

        {/* Whatsapp Support */}
        <div className="fixed bottom-6 right-6">
          <a
            href="https://wa.me/5511918505799?text=Olá! Gostaria de tirar uma dúvida sobre meu pedido."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
          >
            <Phone className="w-6 h-6 text-white" />
          </a>
        </div>
      </main>
    </div>
  )
}
