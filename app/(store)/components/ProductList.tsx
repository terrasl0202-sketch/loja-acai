"use client"

import { Sparkles } from "lucide-react"
import { ProductCard } from "./ProductCard"

interface Product {
  id: number
  name: string
  description: string
  price: number
  image?: string
}

interface ProductListProps {
  products: Product[]
  quantities: Record<number, number>
  onUpdateQuantity: (id: number, delta: number) => void
  customerFavorites?: number[]
  onToggleFavorite?: (id: number) => void
}

export function ProductList({
  products,
  quantities,
  onUpdateQuantity,
  customerFavorites = [],
  onToggleFavorite
}: ProductListProps) {
  return (
    <section className="mt-6 space-y-3 px-3">
      <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-2">
        <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/40 rounded-full"></span>
        Cardapio
        <Sparkles className="w-4 h-4 text-primary/50" />
      </h3>
      
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={quantities[product.id] || 0}
          onUpdateQuantity={onUpdateQuantity}
          isBestSeller={index === 0}
          isGoodPrice={product.price < 20 && index !== 0}
          isFavorite={customerFavorites.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </section>
  )
}
