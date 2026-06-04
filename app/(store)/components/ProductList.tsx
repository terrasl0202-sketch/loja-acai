"use client"

import { Sparkles } from "lucide-react"
import { ProductCard } from "./ProductCard"

interface Product {
  id: number
  name: string
  description: string
  price: number
  image?: string
  // Novos campos de badge
  badgeEnabled?: boolean
  badgeText?: string
  badgeType?: string
  badgeColor?: string
  // Novos campos de serving
  servingText?: string
  showServingText?: boolean
}

interface ProductListProps {
  products: Product[]
  quantities: Record<number, number>
  onUpdateQuantity: (id: number, delta: number) => void
  customerFavorites?: number[]
  onToggleFavorite?: (id: number) => void
  showDescriptions?: boolean
}

export function ProductList({
  products,
  quantities,
  onUpdateQuantity,
  customerFavorites = [],
  onToggleFavorite,
  showDescriptions = true
}: ProductListProps) {
  return (
    <section className="mt-6 space-y-3 px-3">
      <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-2">
        <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/40 rounded-full"></span>
        Cardapio
        <Sparkles className="w-4 h-4 text-primary/50" />
      </h3>
      
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={quantities[product.id] || 0}
          onUpdateQuantity={onUpdateQuantity}
          isFavorite={customerFavorites.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
          showDescription={showDescriptions}
        />
      ))}
    </section>
  )
}
