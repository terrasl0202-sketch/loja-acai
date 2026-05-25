"use client"

import { ShoppingCart } from "lucide-react"
import { formatCurrency } from "../utils"

interface Product {
  id: number
  name: string
  price: number
}

interface CartSummaryProps {
  products: Product[]
  quantities: Record<number, number>
  total: number
}

export function CartSummary({ products, quantities, total }: CartSummaryProps) {
  const hasItems = Object.values(quantities).some(qty => qty > 0)
  
  if (!hasItems) return null

  return (
    <section id="checkout-section" className="mt-8 bg-card rounded-2xl p-4 border border-primary/30 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Seu Pedido</h3>
      </div>
      
      <div className="space-y-2">
        {products.map((product) => {
          const qty = quantities[product.id] || 0
          if (qty === 0) return null
          return (
            <div key={product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {qty}x {product.name}
              </span>
              <span className="text-foreground font-medium">
                {formatCurrency(product.price * qty)}
              </span>
            </div>
          )
        })}
      </div>
      
      <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
        <span className="text-foreground font-semibold">Total</span>
        <span className="text-xl font-bold text-primary">
          {formatCurrency(total)}
        </span>
      </div>
    </section>
  )
}
