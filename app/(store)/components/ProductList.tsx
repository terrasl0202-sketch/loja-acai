"use client"

import { Sparkles, Package } from "lucide-react"
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
  cardsShadow?: boolean
  isLoading?: boolean
}

// Skeleton de produto para loading
function ProductSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-card rounded-2xl border border-border animate-pulse">
      <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted/70 rounded w-full" />
        <div className="h-4 bg-muted/70 rounded w-1/2" />
        <div className="flex justify-between items-center mt-2">
          <div className="h-6 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}

// Empty state quando nao tem produtos
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Em breve novos produtos</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Estamos preparando novidades deliciosas para voce. Volte em breve!
      </p>
    </div>
  )
}

export function ProductList({
  products,
  quantities,
  onUpdateQuantity,
  customerFavorites = [],
  onToggleFavorite,
  showDescriptions = true,
  cardsShadow = true,
  isLoading = false
}: ProductListProps) {
  // Mostra skeletons durante loading
  if (isLoading) {
    return (
      <section className="mt-6 space-y-3 px-3">
        <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-2">
          <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/40 rounded-full"></span>
          Cardapio
          <Sparkles className="w-4 h-4 text-primary/50" />
        </h3>
        {[1, 2, 3].map(i => <ProductSkeleton key={i} />)}
      </section>
    )
  }

  // Mostra empty state se nao tem produtos
  if (!products || products.length === 0) {
    return (
      <section className="mt-6 px-3">
        <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-2">
          <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/40 rounded-full"></span>
          Cardapio
          <Sparkles className="w-4 h-4 text-primary/50" />
        </h3>
        <EmptyState />
      </section>
    )
  }

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
          cardsShadow={cardsShadow}
        />
      ))}
    </section>
  )
}
