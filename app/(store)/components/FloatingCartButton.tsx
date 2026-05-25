"use client"

import { ShoppingCart, X } from "lucide-react"
import { formatCurrency } from "../utils"

interface FloatingCartButtonProps {
  isStoreOpen: boolean
  totalItems: number
  total: number
  onOpenCheckout: () => void
}

export function FloatingCartButton({
  isStoreOpen,
  totalItems,
  total,
  onOpenCheckout
}: FloatingCartButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
      <div className="max-w-lg mx-auto">
        {!isStoreOpen ? (
          <div className="w-full py-3 bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-400 font-bold text-base rounded-xl flex items-center justify-center gap-2 border border-red-500/20">
            <X className="w-4 h-4" />
            Loja Fechada
          </div>
        ) : (
          <button
            onClick={onOpenCheckout}
            disabled={totalItems === 0}
            className="premium-btn w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-between px-4 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
          >
            {totalItems > 0 ? (
              <>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold tabular-nums">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
                <span className="font-bold tracking-wide text-base">Finalizar Pedido</span>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold tabular-nums">
                  {formatCurrency(total)}
                </span>
              </>
            ) : (
              <>
                <span></span>
                <span className="flex items-center gap-2 font-bold">
                  <ShoppingCart className="w-4 h-4" />
                  Finalizar Pedido
                </span>
                <span></span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
