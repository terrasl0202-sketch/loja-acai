"use client"

import { ShoppingCart } from "lucide-react"

interface EmptyCartProps {
  onClose: () => void
}

export function EmptyCart({ onClose }: EmptyCartProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
        <ShoppingCart className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Carrinho vazio</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Adicione itens deliciosos ao seu carrinho
      </p>
      <button
        onClick={onClose}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Explorar cardapio
      </button>
    </div>
  )
}
