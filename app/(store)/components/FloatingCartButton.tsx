"use client"

import { ShoppingCart, Clock } from "lucide-react"
import { formatCurrency } from "../utils"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface FloatingCartButtonProps {
  isStoreOpen: boolean
  totalItems: number
  total: number
  onOpenCheckout: () => void
  hidden?: boolean // Ocultar quando checkout/pix/modal aberto
}

export function FloatingCartButton({
  isStoreOpen,
  totalItems,
  total,
  onOpenCheckout,
  hidden = false
}: FloatingCartButtonProps) {
  const hasItems = totalItems > 0
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Nao renderizar se deve estar oculto
  if (hidden) {
    return null
  }
  
  const buttonContent = (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 bg-background border-t border-border"
      style={{ 
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
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
                : "bg-muted/50 text-muted-foreground/70 cursor-not-allowed border border-border/50"
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
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
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
  
  // Renderiza via portal para garantir que fique acima de tudo
  if (mounted && typeof document !== 'undefined') {
    return createPortal(buttonContent, document.body)
  }
  
  // SSR fallback
  return buttonContent
}
