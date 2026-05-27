"use client"

import { ShoppingCart, Tag, Truck } from "lucide-react"
import { formatCurrency } from "../../utils"

interface Product {
  id: number
  name: string
  price: number
}

interface AppliedCoupon {
  code: string
  type: "percent" | "fixed"
  value: number
}

interface CheckoutOrderSummaryProps {
  products: Product[]
  quantities: Record<number, number>
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  totalItems: number
  appliedCoupon: AppliedCoupon | null
  couponCode: string
  couponError: string
  hasCoupons: boolean
  onCouponCodeChange: (code: string) => void
  onApplyCoupon: () => void
  onRemoveCoupon: () => void
}

export function CheckoutOrderSummary({
  products,
  quantities,
  subtotal,
  discount,
  deliveryFee,
  total,
  totalItems,
  appliedCoupon,
  couponCode,
  couponError,
  hasCoupons,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon
}: CheckoutOrderSummaryProps) {
  return (
    <section className="premium-card rounded-2xl p-5 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          Resumo do Pedido
        </h3>
        <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </span>
      </div>
        
      <div className="space-y-2">
        {products.map((product) => {
          const qty = quantities[product.id] || 0
          if (qty === 0) return null
          return (
            <div key={product.id} className="flex justify-between items-center text-sm py-2.5 border-b border-border/30 last:border-0 group hover:bg-secondary/20 -mx-2 px-2 rounded-lg transition-colors">
              <span className="text-muted-foreground flex items-center gap-2.5">
                <span className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
                <span className="group-hover:text-foreground transition-colors">{product.name}</span>
              </span>
              <span className="text-foreground font-semibold tabular-nums">
                {formatCurrency(product.price * qty)}
              </span>
            </div>
          )
        })}
      </div>
        
      {/* Subtotal, Desconto, Taxa, Total */}
      <div className="border-t border-primary/10 mt-4 pt-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {appliedCoupon && discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Cupom {appliedCoupon.code}
            </span>
            <span className="text-green-400 font-semibold">-{formatCurrency(discount)}</span>
          </div>
        )}
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Taxa de entrega
            </span>
            <span className="text-foreground tabular-nums">{formatCurrency(deliveryFee)}</span>
          </div>
        )}
          
        {/* Total Premium */}
        <div className="flex justify-between items-center pt-3 border-t border-primary/20 mt-3">
          <span className="text-foreground font-bold text-lg">Total</span>
          <div className="text-right">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Cupom */}
      {hasCoupons && !appliedCoupon && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
              placeholder="Codigo do cupom"
              className="premium-input flex-1 px-4 py-3 bg-input/50 border border-border/50 rounded-xl text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <button
              onClick={onApplyCoupon}
              className="premium-btn px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
            >
              Aplicar
            </button>
          </div>
          {couponError && (
            <p className="text-red-400 text-xs mt-2">{couponError}</p>
          )}
        </div>
      )}
      {appliedCoupon && (
        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between bg-green-500/5 -mx-2 px-3 py-2 rounded-xl">
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold">Cupom {appliedCoupon.code} aplicado</span>
          </div>
          <button
            onClick={onRemoveCoupon}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Remover
          </button>
        </div>
      )}
    </section>
  )
}
