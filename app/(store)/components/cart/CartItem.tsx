"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "../../utils"

interface CartItemProps {
  id: number
  name: string
  price: number
  quantity: number
  onUpdateQuantity: (id: number, delta: number) => void
}

export function CartItem({ id, name, price, quantity, onUpdateQuantity }: CartItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 modal-card-solid rounded-xl group">
      {/* Produto info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{name}</h4>
        <p className="text-primary font-bold text-sm">{formatCurrency(price)}</p>
      </div>
      
      {/* Quantidade controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdateQuantity(id, -1)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            quantity === 1 
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
          aria-label={quantity === 1 ? `Remover ${name}` : `Diminuir quantidade de ${name}`}
        >
          {quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
        
        <span className="w-8 text-center font-bold text-foreground tabular-nums">
          {quantity}
        </span>
        
        <button
          onClick={() => onUpdateQuantity(id, 1)}
          className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all"
          aria-label={`Aumentar quantidade de ${name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {/* Subtotal do item */}
      <div className="w-20 text-right">
        <p className="font-bold text-foreground text-sm">{formatCurrency(price * quantity)}</p>
      </div>
    </div>
  )
}
