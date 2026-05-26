"use client"

import { ShoppingCart, X, Clock } from "lucide-react"
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
          <div className="w-full py-3.5 bg-gradient-to-r from-red-500/15 to-orange-500/10 text-red-400 font-bold text-base rounded-2xl flex items-center justify-center gap-3 border border-red-500/20">
            <Clock className="w-5 h-5" />
            <span>Loja fechada no momento</span>
          </div>
        ) : (
          <button
            onClick={onOpenCheckout}
            disabled={totalItems === 0}
            className="premium-btn w-full py-4 bg-primary text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-between px-5 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-lg shadow-lg shadow-primary/25"
          >
            {totalItems > 0 ? (
              <>
                <span className="bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-xs font-bold tabular-nums">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
                <span className="font-bold tracking-wide text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Finalizar
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-xs font-bold tabular-nums">
                  {formatCurrency(total)}
                </span>
              </>
            ) : (
              <>
                <span></span>
                <span className="flex items-center gap-2 font-bold text-primary-foreground/70">
                  <ShoppingCart className="w-4 h-4" />
                  Adicione itens ao carrinho
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
