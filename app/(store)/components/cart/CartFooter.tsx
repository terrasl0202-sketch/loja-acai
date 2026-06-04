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
    <div className="border-t border-border p-6 space-y-5 bg-card">
      {/* Resumo de valores */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Taxa de entrega</span>
            <span className="font-medium">{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-500 font-semibold">
            <span>Desconto</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <span className="text-base font-bold">Total</span>
          <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
      
      {/* Botoes Ultra Premium */}
      <div className="space-y-3">
        {isStoreOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-4.5 bg-primary text-primary-foreground font-bold text-base rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.97] glow-soft hover:glow-primary"
            style={{ paddingTop: '18px', paddingBottom: '18px' }}
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
          className="w-full py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 rounded-2xl hover:bg-muted/15 border border-transparent hover:border-border"
        >
          Continuar comprando
        </button>
      </div>
    </div>
  )
}
