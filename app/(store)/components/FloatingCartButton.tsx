"use client"

import { ShoppingCart, Clock } from "lucide-react"
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
  const hasItems = totalItems > 0
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" style={{ backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-lg mx-auto">
        {!isStoreOpen ? (
          <div className="w-full py-3.5 bg-red-500/10 text-red-500 font-bold text-base rounded-2xl flex items-center justify-center gap-3 border border-red-500/20">
            <Clock className="w-5 h-5" />
            <span>Loja fechada no momento</span>
          </div>
        ) : (
          <button
            onClick={onOpenCheckout}
            disabled={!hasItems}
            className={`w-full py-4 font-bold text-sm rounded-2xl flex items-center justify-between px-5 transition-all duration-300 ${
              hasItems 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]" 
                : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
            }`}
          >
            {hasItems ? (
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
                <span className="flex items-center gap-2 font-medium">
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
