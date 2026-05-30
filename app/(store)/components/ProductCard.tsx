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
    <div className="product-card p-5 animate-fadeIn">
      {/* Badge Premium - canto superior esquerdo */}
      {isBestSeller && (
        <span className="absolute -top-2 left-4 badge-bestseller flex items-center gap-1.5 z-10">
          <Star className="w-3 h-3 fill-white" />
          Mais vendido
        </span>
      )}
      {isGoodPrice && !isBestSeller && (
        <span className="absolute -top-2 left-4 badge-promo z-10">
          Otimo preco
        </span>
      )}
      
      <div className="flex justify-between items-start gap-4 relative z-[1]">
        <div className="flex-1 pr-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-foreground text-lg tracking-tight leading-tight">{product.name}</h4>
              <p className="text-[11px] text-muted-foreground font-medium mt-1">Serve 1 pessoa</p>
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
