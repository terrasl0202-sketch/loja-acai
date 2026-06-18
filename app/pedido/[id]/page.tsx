"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package, ChefHat, CheckCircle2, Clock, ShoppingBag, Phone, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

interface PublicOrder {
  id: string
  orderCode?: string
  customerName: string
  items: string | Array<{ productName?: string; name?: string; quantity: number; price: number; subtotal?: number }>
  itemsDetailed?: { productName: string; quantity: number; price: number; subtotal: number }[]
  total: number
  paymentMethod: string
  deliveryType?: string
  neighborhood?: string
  status: "pending" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled"
  paymentStatus?: "pending" | "confirmed" | "failed"
  createdAt: string
  confirmedAt?: string
  saiuParaEntregaEm?: string
  entregadorNome?: string
}

// Helper para formatar itens do pedido
function formatItems(items: PublicOrder['items']): string {
  if (typeof items === 'string') return items
  if (Array.isArray(items)) {
    return items.map(item => {
      const name = item.productName || item.name || 'Produto'
      const qty = item.quantity || 1
      const subtotal = item.subtotal || (item.price * qty)
      return `${qty}x ${name} - R$ ${subtotal.toFixed(2)}`
    }).join(', ')
  }
  return 'Sem itens'
}

interface StoreSettings {
  whatsapp?: string
  whatsappConfig?: { number?: string }
}

const statusLabels: Record<string, string> = {
  pending: "Aguardando Pagamento",
  confirmed: "Pedido Confirmado",
  preparing: "Em Preparo",
  delivering: "Saiu para Entrega",
  completed: "Entregue",
  cancelled: "Cancelado",
}

// Componente da Motinha - icone moderno de delivery
function MotoIcon({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${animate ? "animate-moto-shake" : ""}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Moto delivery moderna */}
      <circle cx="5" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="19" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5 17h2.5l2-4h4l1.5-3h3l1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M15 13l1.5 4h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Caixa de delivery */}
      <rect x="8" y="8" width="5" height="4" rx="0.5" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1" />
      {/* Guidao */}
      <path d="M17 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Componente de Fumaca
function Smoke({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex gap-1">
      <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-smoke-1" />
      <div className="w-1.5 h-1.5 bg-muted-foreground/20 rounded-full animate-smoke-2" />
      <div className="w-1 h-1 bg-muted-foreground/10 rounded-full animate-smoke-3" />
    </div>
  )
}

export default function PedidoPage() {
  const params = useParams()
  const orderId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""
  
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
  
  // Buscar settings da loja para WhatsApp
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/store-settings', { cache: 'no-store' })
        const data = await res.json()
        if (data.success && data.settings) {
          setStoreSettings(data.settings)
        }
      } catch (err) {
        console.error('[Pedido] Erro ao carregar settings:', err)
      }
    }
    loadSettings()
  }, [])
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/public/${orderId}`)
      const data = await res.json()
      
      if (data.success && data.order) {
        setOrder(data.order)
        setError(null)
      } else {
        setError("Pedido nao encontrado")
      }
    } catch {
      setError("Erro ao carregar pedido")
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrder()
      const interval = setInterval(fetchOrder, 30000)
      return () => clearInterval(interval)
    }
  }, [orderId])

  // Calcular posicao da motinha (0-100%)
  const getMotoPosition = () => {
    if (!order) return 0
    if (order.status === "cancelled") return 0
    
    switch (order.status) {
      case "pending":
        // Pagamento ainda nao confirmado: barra zerada (aguardando).
        return order.paymentStatus === "confirmed" ? 15 : 0
      case "confirmed":
        return 25
      case "preparing":
        return 50
      case "delivering":
        return 75
      case "completed":
        return 100
      default:
        return 0
    }
  }

  // Mapear status para step index (-1 a 3)
  // -1 = Aguardando Pagamento (nenhuma etapa ativa), 0 = Confirmado,
  // 1 = Preparando, 2 = A caminho, 3 = Entregue
  const getStepIndex = () => {
    if (!order) return -1
    switch (order.status) {
      case "pending":
        // So entra em "Confirmado" quando o pagamento estiver confirmado.
        // Enquanto aguarda pagamento, nenhuma etapa fica ativa (evita conflito
        // visual com o badge "Aguardando Pagamento").
        return order.paymentStatus === "confirmed" ? 0 : -1
      case "confirmed":
        return 0 // Aguardando preparo
      case "preparing":
        return 1 // Em preparacao
      case "delivering":
        return 2 // A caminho
      case "completed":
        return 3 // Entregue
      default:
        return 0
    }
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
          <MotoIcon className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
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

  const motoPosition = getMotoPosition()
  const currentStep = getStepIndex()
  const isDelivering = order.status === "delivering"
  const isCompleted = order.status === "completed"

  const steps = [
    { label: "Confirmado", icon: "1" },
    { label: "Preparando", icon: "2" },
    { label: "A caminho", icon: "3" },
    { label: "Entregue", icon: "4" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pedido</p>
              <p className="font-bold text-primary text-lg">{order.id}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Status Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 rounded-3xl p-6 border border-primary/10">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          
          <div className="relative z-10 text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-3 ${
              order.status === "cancelled" 
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isCompleted
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-primary/20 text-primary border border-primary/30"
            }`}>
              {isCompleted && <Sparkles className="w-4 h-4" />}
              {statusLabels[order.status]}
            </div>
            <p className="text-foreground font-medium">Ola, {order.customerName.split(" ")[0]}!</p>
            {lastUpdate && (
              <p className="text-muted-foreground text-xs mt-1">
                Atualizado as {formatTime(lastUpdate.toISOString())}
              </p>
            )}
          </div>

          {/* Progress Track com Motinha */}
          {order.status !== "cancelled" && (
            <div className="relative mt-8 mb-4">
              {/* Linha de fundo */}
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                {/* Linha de progresso */}
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${motoPosition}%` }}
                />
              </div>

              {/* Motinha */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                style={{ left: `calc(${motoPosition}% - 24px)` }}
              >
                <div className="relative">
                  <Smoke show={isDelivering} />
                  <MotoIcon 
                    className={`w-12 h-8 text-primary drop-shadow-lg ${isCompleted ? "text-emerald-500" : ""}`}
                    animate={isDelivering}
                  />
                </div>
              </div>

              {/* Pontos de etapa */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0">
                {[0, 33, 66, 100].map((pos, i) => (
                  <div 
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                      motoPosition >= pos 
                        ? "bg-primary border-primary shadow-lg shadow-primary/30" 
                        : "bg-card border-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Labels das etapas */}
          {order.status !== "cancelled" && (
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-6 px-0">
              {steps.map((step, i) => (
                <div 
                  key={i} 
                  className={`text-center w-1/4 transition-colors ${
                    currentStep >= i ? "text-primary font-medium" : ""
                  } ${currentStep === i ? "text-foreground font-bold" : ""}`}
                >
                  <div className={`w-6 h-6 mx-auto mb-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= i 
                      ? currentStep === i 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {currentStep > i ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  {step.label}
                </div>
              ))}
            </div>
          )}

          {/* Mensagem de entrega concluida */}
          {isCompleted && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-400 font-bold">Pedido entregue com sucesso!</p>
              <p className="text-emerald-400/70 text-sm">Obrigado pela preferencia</p>
            </div>
          )}

          {/* Info do entregador */}
          {order.status === "delivering" && order.entregadorNome && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">{order.entregadorNome.charAt(0)}</span>
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">{order.entregadorNome}</p>
                <p className="text-muted-foreground text-xs">Esta a caminho do seu endereco</p>
              </div>
            </div>
          )}

          {/* Status cancelado */}
          {order.status === "cancelled" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-medium">Este pedido foi cancelado</p>
            </div>
          )}
        </div>

        {/* Detalhes do Pedido */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Detalhes do Pedido
          </h2>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
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
              <p className="text-xs text-muted-foreground mb-2 font-medium">Itens do pedido</p>
              {order.itemsDetailed && order.itemsDetailed.length > 0 ? (
                <div className="space-y-2">
                  {order.itemsDetailed.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.quantity}x {item.productName}</span>
                      <span className="text-muted-foreground">R$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {order.itemsDetailed.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{order.itemsDetailed.length - 3} mais itens</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-line line-clamp-3">{formatItems(order.items)}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <span className="font-medium text-foreground">Total</span>
              <span className="text-xl font-black text-primary">R$ {order.total.toFixed(2)}</span>
            </div>

            {/* Info adicional */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Pagamento</p>
                <p className="text-foreground font-medium">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Horario</p>
                <p className="text-foreground font-medium">{formatTime(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline detalhada */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historico
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm text-foreground">Pedido recebido</p>
                <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            
            {order.confirmedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm text-foreground">Pagamento confirmado</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.confirmedAt)}</p>
                </div>
              </div>
            )}
            
            {order.saiuParaEntregaEm && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm text-foreground">Saiu para entrega</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.saiuParaEntregaEm)}
                    {order.entregadorNome && ` - ${order.entregadorNome}`}
                  </p>
                </div>
              </div>
            )}
            
            {isCompleted && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Entregue</p>
                  <p className="text-xs text-muted-foreground">Pedido finalizado</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Atualizacao automatica a cada 30 segundos</p>
          <button 
            onClick={fetchOrder}
            className="text-primary text-sm font-medium hover:underline active:scale-95 transition-transform"
          >
            Atualizar agora
          </button>
        </div>

        {/* Spacer para o botao do WhatsApp */}
        <div className="h-20" />

        {/* Whatsapp Support */}
        {(storeSettings?.whatsappConfig?.number || storeSettings?.whatsapp) && (
        <div className="fixed bottom-6 right-6">
          <a
            href={`https://wa.me/${storeSettings?.whatsappConfig?.number || storeSettings?.whatsapp}?text=Olá! Gostaria de tirar uma dúvida sobre meu pedido.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 transition-all active:scale-95"
          >
            <Phone className="w-6 h-6 text-white" />
          </a>
        </div>
        )}
      </main>

      {/* CSS para animacoes */}
      <style jsx>{`
        @keyframes moto-shake {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(-1deg); }
          75% { transform: translateY(1px) rotate(1deg); }
        }
        
        @keyframes smoke-1 {
          0% { opacity: 0.4; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(-12px) scale(1.5); }
        }
        
        @keyframes smoke-2 {
          0% { opacity: 0.3; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(-16px) scale(1.3); }
        }
        
        @keyframes smoke-3 {
          0% { opacity: 0.2; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(-20px) scale(1.2); }
        }
        
        .animate-moto-shake {
          animation: moto-shake 0.3s ease-in-out infinite;
        }
        
        .animate-smoke-1 {
          animation: smoke-1 0.8s ease-out infinite;
        }
        
        .animate-smoke-2 {
          animation: smoke-2 0.8s ease-out infinite 0.1s;
        }
        
        .animate-smoke-3 {
          animation: smoke-3 0.8s ease-out infinite 0.2s;
        }
      `}</style>
    </div>
  )
}
