"use client"

import { Minus, Plus, Star, Heart, Sparkles, Tag, Flame, Zap } from "lucide-react"
import { formatCurrency } from "../utils"

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

interface ProductCardProps {
  product: Product
  quantity: number
  onUpdateQuantity: (id: number, delta: number) => void
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
}

// Mapeia tipo de badge para classe CSS
function getBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    mais_vendido: "badge-bestseller",
    promocao: "badge-promo",
    novidade: "badge-new",
    otimo_preco: "badge-promo",
    destaque: "badge-bestseller",
    personalizado: "badge-new",
  }
  return classes[type] || "badge-bestseller"
}

// Mapeia tipo de badge para icone
function getBadgeIcon(type: string) {
  const icons: Record<string, typeof Star> = {
    mais_vendido: Star,
    promocao: Tag,
    novidade: Sparkles,
    otimo_preco: Tag,
    destaque: Flame,
    personalizado: Zap,
  }
  return icons[type] || Star
}

export function ProductCard({
  product,
  quantity,
  onUpdateQuantity,
  isFavorite,
  onToggleFavorite
}: ProductCardProps) {
  // Verifica se deve mostrar badge
  const showBadge = product.badgeEnabled && product.badgeText
  const BadgeIcon = showBadge ? getBadgeIcon(product.badgeType || 'mais_vendido') : Star
  const badgeClass = showBadge ? getBadgeClass(product.badgeType || 'mais_vendido') : ''
  
  // Verifica se deve mostrar serving text
  const showServing = product.showServingText && product.servingText
  
  return (
    <div className="product-card p-5 animate-fadeIn">
      {/* Badge Premium - posicionado para nao cortar */}
      {showBadge && (
        <span 
          className={`absolute -top-3 left-4 ${badgeClass} flex items-center gap-1.5 z-20 shadow-lg`}
          style={product.badgeColor ? { background: product.badgeColor } : undefined}
        >
          <BadgeIcon className="w-3 h-3 fill-white" />
          {product.badgeText}
        </span>
      )}
      
      <div className="flex justify-between items-start gap-4 relative z-[1]">
        <div className="flex-1 pr-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-foreground text-lg tracking-tight leading-tight">{product.name}</h4>
              {showServing && (
                <p className="text-[11px] text-muted-foreground font-medium mt-1">{product.servingText}</p>
              )}
            </div>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`p-2 rounded-2xl transition-all duration-300 ${
                  isFavorite
                    ? "text-red-500 bg-red-500/15 shadow-lg shadow-red-500/20"
                    : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                }`}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart 
                  className={`w-5 h-5 transition-all duration-300 ${isFavorite ? "fill-red-500 scale-110" : "hover:scale-110"}`} 
                />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2">
            {product.description}
          </p>
          <div className="mt-4">
            <span className="text-2xl font-black text-primary tracking-tight">
              {formatCurrency(product.price)}
            </span>
          </div>
        </div>
        
        {/* Controles de quantidade - Ultra Premium */}
        <div className="flex items-center gap-1.5 bg-muted/20 rounded-2xl p-1.5 border border-border/50">
          <button
            onClick={() => onUpdateQuantity(product.id, -1)}
            className="qty-btn qty-btn-minus w-10 h-10"
            aria-label={`Diminuir quantidade de ${product.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-black text-foreground tabular-nums text-lg">
            {quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(product.id, 1)}
            className="qty-btn qty-btn-plus w-10 h-10"
            aria-label={`Aumentar quantidade de ${product.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
