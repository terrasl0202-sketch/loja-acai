"use client"

import { ShoppingCart, Sparkles } from "lucide-react"

interface EmptyCartProps {
  onClose: () => void
}

export function EmptyCart({ onClose }: EmptyCartProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-primary/10">
          <ShoppingCart className="w-12 h-12 text-primary/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Seu carrinho esta vazio</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-[200px]">
        Que tal explorar nossos deliciosos acais?
      </p>
      <button
        onClick={onClose}
        className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all duration-200 active:scale-95 shadow-lg shadow-primary/25"
      >
        Ver cardapio
      </button>
    </div>
  )
}
