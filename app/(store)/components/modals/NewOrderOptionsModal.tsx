"use client"

import { ShoppingCart } from "lucide-react"

interface NewOrderOptionsModalProps {
  onStartFromScratch: () => void
  onKeepData: () => void
  onCancel: () => void
}

export function NewOrderOptionsModal({ onStartFromScratch, onKeepData, onCancel }: NewOrderOptionsModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Novo Pedido</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Como voce deseja comecar seu novo pedido?
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onStartFromScratch}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Novo pedido do zero
            </button>
            <button
              onClick={onKeepData}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Manter dados de entrega
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
