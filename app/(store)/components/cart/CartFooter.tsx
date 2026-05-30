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
    <div className="border-t border-border p-5 space-y-4 modal-card-solid">
      {/* Resumo de valores */}
      <div className="space-y-2 text-sm">
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
          <div className="flex justify-between text-emerald-500 font-medium">
            <span>Desconto</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg pt-3 border-t border-border">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
      
      {/* Botoes Premium */}
      <div className="space-y-2.5">
        {isStoreOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
          >
            <ShoppingCart className="w-5 h-5" />
            Finalizar Pedido
          </button>
        ) : (
          <div className="w-full py-4 bg-red-500/10 text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 border border-red-500/20">
            Loja fechada no momento
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/10"
        >
          Continuar comprando
        </button>
      </div>
    </div>
  )
}
