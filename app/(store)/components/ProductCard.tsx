"use client"

import { Minus, Plus, Star, Heart } from "lucide-react"
import { formatCurrency } from "../utils"

interface Product {
  id: number
  name: string
  description: string
  price: number
  image?: string
}

interface ProductCardProps {
  product: Product
  quantity: number
  onUpdateQuantity: (id: number, delta: number) => void
  isBestSeller?: boolean
  isGoodPrice?: boolean
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
}

export function ProductCard({
  product,
  quantity,
  onUpdateQuantity,
  isBestSeller,
  isGoodPrice,
  isFavorite,
  onToggleFavorite
}: ProductCardProps) {
  return (
    <div className="product-card p-4 animate-fadeIn">
      {/* Badge Premium - canto superior esquerdo */}
      {isBestSeller && (
        <span className="absolute -top-1 left-3 badge-bestseller text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 z-10">
          <Star className="w-2.5 h-2.5 fill-white" />
          Mais vendido
        </span>
      )}
      {isGoodPrice && !isBestSeller && (
        <span className="absolute -top-1 left-3 badge-promo text-[9px] font-bold px-2.5 py-1 rounded-full z-10">
          Otimo preco
        </span>
      )}
      
      <div className="flex justify-between items-start gap-4 relative z-[1]">
        <div className="flex-1 pr-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-base tracking-tight">{product.name}</h4>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Serve 1 pessoa</p>
            </div>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isFavorite
                    ? "text-red-500 bg-red-500/15"
                    : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                }`}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart 
                  className={`w-4 h-4 transition-all duration-200 ${isFavorite ? "fill-red-500 scale-110" : ""}`} 
                />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
            {product.description}
          </p>
          <p className="text-xl font-bold text-primary mt-3">
            {formatCurrency(product.price)}
          </p>
        </div>
        
        {/* Controles de quantidade - iFood Style */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-2xl p-1">
          <button
            onClick={() => onUpdateQuantity(product.id, -1)}
            className="qty-btn qty-btn-minus w-9 h-9"
            aria-label={`Diminuir quantidade de ${product.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-bold text-foreground tabular-nums text-base">
            {quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(product.id, 1)}
            className="qty-btn qty-btn-plus w-9 h-9"
            aria-label={`Aumentar quantidade de ${product.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
