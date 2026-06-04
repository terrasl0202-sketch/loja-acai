"use client"

import { useRef, useState, useEffect } from "react"
import { Flame, Tag, Sparkles, Crown, ChevronLeft, ChevronRight, Star } from "lucide-react"
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
  best_seller?: boolean
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
  showFeatured?: boolean
  showDescriptions?: boolean
  cardsShadow?: boolean
}

// Componente de Scroll Horizontal Premium
function HorizontalScroll({ children, title, icon: Icon, iconColor, accentColor }: {
  children: React.ReactNode
  title: string
  icon: typeof Flame
  iconColor: string
  accentColor: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 10)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }
  
  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    el?.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    return () => {
      el?.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [])
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -280 : 280
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }
  
  return (
    <section className="relative">
      {/* Header da Secao */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
          <span className={`w-1.5 h-6 ${accentColor} rounded-full`} />
          {title}
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </h3>
        
        {/* Setas de navegacao desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeftArrow}
            className={`p-2 rounded-full border transition-all ${
              showLeftArrow 
                ? 'border-border bg-card hover:bg-secondary text-foreground' 
                : 'border-transparent text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showRightArrow}
            className={`p-2 rounded-full border transition-all ${
              showRightArrow 
                ? 'border-border bg-card hover:bg-secondary text-foreground' 
                : 'border-transparent text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Container com scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      
      {/* Gradiente nas bordas (mobile) */}
      {showLeftArrow && (
        <div className="absolute left-0 top-12 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none sm:hidden" />
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-12 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
      )}
    </section>
  )
}

// Card compacto para scroll horizontal
function CompactProductCard({ 
  product, 
  quantity, 
  onUpdateQuantity,
  isFavorite,
  onToggleFavorite,
  showDescription
}: {
  product: Product
  quantity: number
  onUpdateQuantity: (id: number, delta: number) => void
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
  showDescription?: boolean
}) {
  return (
    <div className="w-64 flex-shrink-0 snap-start">
      <ProductCard
        product={product}
        quantity={quantity}
        onUpdateQuantity={onUpdateQuantity}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        showDescription={showDescription}
        showImage={true}
      />
    </div>
  )
}

export function FeaturedSections({
  products,
  quantities,
  onUpdateQuantity,
  customerFavorites = [],
  onToggleFavorite,
  showBestsellers = true,
  showPromos = true,
  showNew = true,
  showFeatured = true,
  showDescriptions = true,
  cardsShadow = true
}: FeaturedSectionsProps) {
  // Filtra produtos mais vendidos (bestSeller ou best_seller = true)
  const bestsellers = products.filter(p => p.bestSeller || p.best_seller).slice(0, 8)
  
  // Filtra produtos em destaque (featured = true)
  const featured = products.filter(p => p.featured).slice(0, 8)
  
  // Filtra produtos em promocao (badgeType = 'promocao' ou 'otimo_preco')
  const promos = products.filter(p => 
    p.badgeEnabled && (p.badgeType === 'promocao' || p.badgeType === 'otimo_preco')
  ).slice(0, 8)
  
  // Filtra novidades (criados nos ultimos 14 dias ou badgeType = 'novidade')
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  
  const newProducts = products.filter(p => {
    if (p.badgeEnabled && p.badgeType === 'novidade') return true
    if (p.createdAt) {
      const createdDate = new Date(p.createdAt)
      return createdDate >= fourteenDaysAgo
    }
    return false
  }).slice(0, 8)

  // Se nenhuma secao tem produtos, nao renderiza nada
  const hasBestsellers = showBestsellers && bestsellers.length > 0
  const hasFeatured = showFeatured && featured.length > 0
  const hasPromos = showPromos && promos.length > 0
  const hasNew = showNew && newProducts.length > 0
  
  if (!hasBestsellers && !hasFeatured && !hasPromos && !hasNew) {
    return null
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Destaques - Visual Diferenciado */}
      {hasFeatured && (
        <HorizontalScroll 
          title="Destaques" 
          icon={Crown} 
          iconColor="text-amber-500"
          accentColor="bg-gradient-to-b from-amber-500 to-amber-600"
        >
          {featured.map((product) => (
            <CompactProductCard
              key={product.id}
              product={{
                ...product,
                badgeEnabled: true,
                badgeText: 'Destaque',
                badgeType: 'destaque'
              }}
              quantity={quantities[product.id] || 0}
              onUpdateQuantity={onUpdateQuantity}
              isFavorite={customerFavorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              showDescription={showDescriptions}
            />
          ))}
        </HorizontalScroll>
      )}

      {/* Mais Vendidos */}
      {hasBestsellers && (
        <HorizontalScroll 
          title="Mais Vendidos" 
          icon={Flame} 
          iconColor="text-orange-500"
          accentColor="bg-gradient-to-b from-orange-500 to-red-500"
        >
          {bestsellers.map((product) => (
            <CompactProductCard
              key={product.id}
              product={{
                ...product,
                badgeEnabled: true,
                badgeText: 'Top',
                badgeType: 'mais_vendido'
              }}
              quantity={quantities[product.id] || 0}
              onUpdateQuantity={onUpdateQuantity}
              isFavorite={customerFavorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              showDescription={showDescriptions}
            />
          ))}
        </HorizontalScroll>
      )}

      {/* Promocoes */}
      {hasPromos && (
        <HorizontalScroll 
          title="Promocoes" 
          icon={Tag} 
          iconColor="text-green-500"
          accentColor="bg-gradient-to-b from-green-500 to-emerald-600"
        >
          {promos.map((product) => (
            <CompactProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] || 0}
              onUpdateQuantity={onUpdateQuantity}
              isFavorite={customerFavorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              showDescription={showDescriptions}
            />
          ))}
        </HorizontalScroll>
      )}

      {/* Novidades */}
      {hasNew && (
        <HorizontalScroll 
          title="Novidades" 
          icon={Sparkles} 
          iconColor="text-purple-500"
          accentColor="bg-gradient-to-b from-purple-500 to-violet-600"
        >
          {newProducts.map((product) => (
            <CompactProductCard
              key={product.id}
              product={{
                ...product,
                badgeEnabled: true,
                badgeText: 'Novo',
                badgeType: 'novidade'
              }}
              quantity={quantities[product.id] || 0}
              onUpdateQuantity={onUpdateQuantity}
              isFavorite={customerFavorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              showDescription={showDescriptions}
            />
          ))}
        </HorizontalScroll>
      )}
    </div>
  )
}
