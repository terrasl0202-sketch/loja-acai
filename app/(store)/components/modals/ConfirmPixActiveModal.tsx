"use client"

import { AlertCircle } from "lucide-react"

interface ConfirmPixActiveModalProps {
  onClose: () => void
  onNewOrder: () => void
}

export function ConfirmPixActiveModal({ onClose, onNewOrder }: ConfirmPixActiveModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">PIX Ativo</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Existe um PIX ativo para este pedido. Para alterar algo, voce precisa iniciar um novo pedido.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Continuar neste pedido
            </button>
            <button
              onClick={onNewOrder}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Fazer novo pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
