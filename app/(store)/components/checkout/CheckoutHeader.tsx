"use client"

import { ShoppingCart, X } from "lucide-react"

interface CheckoutHeaderProps {
  title: string
  itemsCount: number
  onClose: () => void
}

export function CheckoutHeader({ title, itemsCount, onClose }: CheckoutHeaderProps) {
  return (
    <header className="sticky top-0 z-10 glass border-b border-white/5">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">
                {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} no carrinho
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-secondary/60 hover:bg-secondary rounded-xl text-foreground/70 hover:text-foreground transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </header>
  )
}
