"use client"

import { X, Loader2, Package } from "lucide-react"
import type { CustomerOrder } from "../../types"

interface MyOrdersModalProps {
  orders: CustomerOrder[]
  loadingOrders: boolean
  onClose: () => void
  onRepeatOrder: (order: CustomerOrder) => void
}

export function MyOrdersModal({ orders, loadingOrders, onClose, onRepeatOrder }: MyOrdersModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Meus Pedidos</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-secondary/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.status === "completed" ? "bg-green-500/20 text-green-500" :
                      order.status === "cancelled" ? "bg-red-500/20 text-red-500" :
                      order.status === "delivering" ? "bg-blue-500/20 text-blue-500" :
                      "bg-yellow-500/20 text-yellow-600"
                    }`}>
                      {order.status === "completed" ? "Entregue" :
                       order.status === "cancelled" ? "Cancelado" :
                       order.status === "delivering" ? "Em entrega" :
                       order.status === "preparing" ? "Preparando" :
                       order.status === "confirmed" ? "Confirmado" :
                       "Pendente"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{order.items}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      R$ {order.total.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {order.itemsDetailed && (
                      <button
                        onClick={() => onRepeatOrder(order)}
                        className="flex-1 py-2 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                      >
                        Pedir novamente
                      </button>
                    )}
                    {(order.status === "pending" || order.status === "confirmed" || order.status === "preparing" || order.status === "delivering") && (
                      <a
                        href={`/pedido/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-center"
                      >
                        Acompanhar
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Voce ainda nao fez nenhum pedido</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
