"use client"

import Image from "next/image"
import { Minus, Plus, Star, Heart, Sparkles, Tag, Flame, Zap, ShoppingCart, ImageOff } from "lucide-react"
import { useState } from "react"
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
  // Campo de best seller
  best_seller?: boolean
  // Campo de featured
  featured?: boolean
}

interface ProductCardProps {
  product: Product
  quantity: number
  onUpdateQuantity: (id: number, delta: number) => void
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
  showDescription?: boolean
  showImage?: boolean
  cardsShadow?: boolean
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
  onToggleFavorite,
  showDescription = true,
  showImage = true,
  cardsShadow = true
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Verifica se deve mostrar badge
  const showBadge = product.badgeEnabled && product.badgeText
  const BadgeIcon = showBadge ? getBadgeIcon(product.badgeType || 'mais_vendido') : Star
  const badgeClass = showBadge ? getBadgeClass(product.badgeType || 'mais_vendido') : ''
  
  // Verifica se deve mostrar serving text
  const showServing = product.showServingText && product.servingText
  
  // Verifica se tem imagem valida
  const hasValidImage = showImage && product.image && !imageError
  const isExternalImage = product.image?.startsWith('http://') || product.image?.startsWith('https://')
  
  // Classe de sombra condicional
  const shadowClass = cardsShadow 
    ? 'shadow-[0_2px_8px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]' 
    : ''
  
  return (
    <div className={`product-card p-4 sm:p-5 animate-fadeIn ${shadowClass}`}>
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
      
      <div className="flex gap-4 relative z-[1]">
        {/* Imagem do Produto - Premium */}
        {hasValidImage && (
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-muted flex-shrink-0 group">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-muted-foreground/30" />
              </div>
            )}
            {isExternalImage ? (
              <img
                src={product.image}
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <Image
                src={product.image || ''}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Botao favorito sobre imagem */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(product.id)
                }}
                className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-300 ${
                  isFavorite
                    ? "bg-red-500 text-white shadow-lg scale-100"
                    : "bg-black/30 text-white/80 hover:bg-black/50 scale-0 group-hover:scale-100"
                }`}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart 
                  className={`w-4 h-4 transition-all ${isFavorite ? "fill-white" : ""}`} 
                />
              </button>
            )}
          </div>
        )}
        
        {/* Conteudo - Info e Controles */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground text-base sm:text-lg tracking-tight leading-tight line-clamp-2">{product.name}</h4>
                {showServing && (
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{product.servingText}</p>
                )}
              </div>
              {/* Botao favorito quando nao tem imagem */}
              {!hasValidImage && onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(product.id)}
                  className={`p-2 rounded-xl flex-shrink-0 transition-all duration-300 ${
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
            {showDescription && product.description && product.description.trim() && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          
          {/* Preco e Controles - Alinhados na base */}
          <div className="flex items-end justify-between gap-3 mt-3">
            <span className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {formatCurrency(product.price)}
            </span>
            
            {/* Controles de quantidade - Compacto Premium */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border border-border/50">
              <button
                onClick={() => onUpdateQuantity(product.id, -1)}
                className="qty-btn qty-btn-minus w-8 h-8 sm:w-9 sm:h-9"
                aria-label={`Diminuir quantidade de ${product.name}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-black text-foreground tabular-nums text-base">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(product.id, 1)}
                className="qty-btn qty-btn-plus w-8 h-8 sm:w-9 sm:h-9"
                aria-label={`Aumentar quantidade de ${product.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
