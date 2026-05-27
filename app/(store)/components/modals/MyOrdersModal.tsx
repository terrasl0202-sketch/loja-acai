"use client"

import { X, Loader2, Package, RefreshCw, MapPin, Clock } from "lucide-react"
import type { CustomerOrder } from "../../types"

interface MyOrdersModalProps {
  orders: CustomerOrder[]
  loadingOrders: boolean
  onClose: () => void
  onRepeatOrder: (order: CustomerOrder) => void
}

const statusConfig = {
  completed: { label: "Entregue", bg: "bg-green-500/20", text: "text-green-400" },
  cancelled: { label: "Cancelado", bg: "bg-red-500/20", text: "text-red-400" },
  delivering: { label: "Em entrega", bg: "bg-blue-500/20", text: "text-blue-400" },
  preparing: { label: "Preparando", bg: "bg-amber-500/20", text: "text-amber-400" },
  confirmed: { label: "Confirmado", bg: "bg-primary/20", text: "text-primary" },
  pending: { label: "Pendente", bg: "bg-yellow-500/20", text: "text-yellow-500" },
}

export function MyOrdersModal({ orders, loadingOrders, onClose, onRepeatOrder }: MyOrdersModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Meus Pedidos</h3>
              <p className="text-xs text-muted-foreground">{orders.length} pedido{orders.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="p-4 space-y-3">
              {orders.map(order => {
                const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
                const isActive = ["pending", "confirmed", "preparing", "delivering"].includes(order.status)
                
                return (
                  <div 
                    key={order.id} 
                    className={`bg-secondary/30 rounded-2xl p-4 space-y-3 border ${isActive ? "border-primary/30" : "border-transparent"}`}
                  >
                    {/* Header do pedido */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    {/* Itens */}
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{order.items}</p>
                    
                    {/* Info */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className="text-base font-bold text-primary">
                        R$ {order.total.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    
                    {/* Botoes */}
                    <div className="flex gap-2 pt-1">
                      {order.itemsDetailed && (
                        <button
                          onClick={() => onRepeatOrder(order)}
                          className="flex-1 py-2.5 text-sm bg-primary/15 text-primary rounded-xl hover:bg-primary/25 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Pedir novamente
                        </button>
                      )}
                      {isActive && (
                        <a
                          href={`/pedido/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 text-sm bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium text-center flex items-center justify-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          Acompanhar
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Nenhum pedido ainda</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Faca seu primeiro pedido e acompanhe aqui!
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Explorar cardapio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
