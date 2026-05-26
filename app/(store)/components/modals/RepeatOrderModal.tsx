"use client"

import type { CustomerOrder } from "../../types"

interface RepeatOrderModalProps {
  order: CustomerOrder
  onConfirm: () => void
  onCancel: () => void
}

export function RepeatOrderModal({ order, onConfirm, onCancel }: RepeatOrderModalProps) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Deseja repetir este pedido?</h3>
        </div>
        
        <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
          {order.itemsDetailed?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.quantity}x {item.productName}
              </span>
              <span className="text-muted-foreground">
                R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-bold text-primary text-lg">
              R$ {order.total.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
        
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Sim, pedir novamente
          </button>
        </div>
      </div>
    </div>
  )
}
