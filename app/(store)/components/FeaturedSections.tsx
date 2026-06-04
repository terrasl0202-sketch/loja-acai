"use client"

import { Flame, Tag, Sparkles } from "lucide-react"
import { ProductCard } from "./ProductCard"

interface Product {
  id: number
  name: string
  description: string
  price: number
  image?: string
  badgeEnabled?: boolean
  badgeText?: string
  badgeType?: string
  badgeColor?: string
  servingText?: string
  showServingText?: boolean
  bestSeller?: boolean
  featured?: boolean
  createdAt?: string
}

interface FeaturedSectionsProps {
  products: Product[]
  quantities: Record<number, number>
  onUpdateQuantity: (id: number, delta: number) => void
  customerFavorites?: number[]
  onToggleFavorite?: (id: number) => void
  showBestsellers?: boolean
  showPromos?: boolean
  showNew?: boolean
}

export function FeaturedSections({
  products,
  quantities,
  onUpdateQuantity,
  customerFavorites = [],
  onToggleFavorite,
  showBestsellers = true,
  showPromos = true,
  showNew = true
}: FeaturedSectionsProps) {
  // Filtra produtos mais vendidos (best_seller = true)
  const bestsellers = products.filter(p => p.bestSeller).slice(0, 5)
  
  // Filtra produtos em promocao (badgeType = 'promocao' ou 'otimo_preco')
  const promos = products.filter(p => 
    p.badgeEnabled && (p.badgeType === 'promocao' || p.badgeType === 'otimo_preco')
  ).slice(0, 5)
  
  // Filtra novidades (criados nos ultimos 7 dias ou badgeType = 'novidade')
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const newProducts = products.filter(p => {
    if (p.badgeEnabled && p.badgeType === 'novidade') return true
    if (p.createdAt) {
      const createdDate = new Date(p.createdAt)
      return createdDate >= sevenDaysAgo
    }
    return false
  }).slice(0, 5)

  // Se nenhuma secao tem produtos, nao renderiza nada
  if (
    (!showBestsellers || bestsellers.length === 0) &&
    (!showPromos || promos.length === 0) &&
    (!showNew || newProducts.length === 0)
  ) {
    return null
  }

  return (
    <div className="space-y-6 px-3 mt-6">
      {/* Mais Vendidos */}
      {showBestsellers && bestsellers.length > 0 && (
        <section>
          <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-500/40 rounded-full"></span>
            Mais Vendidos
            <Flame className="w-4 h-4 text-orange-500" />
          </h3>
          <div className="space-y-3">
            {bestsellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onUpdateQuantity={onUpdateQuantity}
                isFavorite={customerFavorites.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Promocoes */}
      {showPromos && promos.length > 0 && (
        <section>
          <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-gradient-to-b from-red-500 to-red-500/40 rounded-full"></span>
            Promocoes
            <Tag className="w-4 h-4 text-red-500" />
          </h3>
          <div className="space-y-3">
            {promos.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onUpdateQuantity={onUpdateQuantity}
                isFavorite={customerFavorites.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Novidades */}
      {showNew && newProducts.length > 0 && (
        <section>
          <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-emerald-500/40 rounded-full"></span>
            Novidades
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </h3>
          <div className="space-y-3">
            {newProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onUpdateQuantity={onUpdateQuantity}
                isFavorite={customerFavorites.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
