"use client"

import { ShoppingCart } from "lucide-react"
import { formatCurrency } from "../../utils"

interface CartFooterProps {
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  isStoreOpen: boolean
  onCheckout: () => void
  onClose: () => void
}

export function CartFooter({ 
  subtotal, 
  deliveryFee, 
  discount,
  total, 
  isStoreOpen, 
  onCheckout,
  onClose
}: CartFooterProps) {
  return (
    <div className="border-t border-border p-4 space-y-3 bg-card/50">
      {/* Resumo de valores */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Taxa de entrega</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-500">
            <span>Desconto</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-foreground font-bold text-base pt-2 border-t border-border">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
      
      {/* Botoes */}
      <div className="space-y-2">
        {isStoreOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/25"
          >
            <ShoppingCart className="w-5 h-5" />
            Finalizar Pedido
          </button>
        ) : (
          <div className="w-full py-3.5 bg-red-500/10 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-500/20">
            Loja fechada no momento
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Continuar comprando
        </button>
      </div>
    </div>
  )
}
