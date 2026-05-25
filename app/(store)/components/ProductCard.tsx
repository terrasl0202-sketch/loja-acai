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
    <div className="product-card p-4">
      {/* Badge Premium - canto superior esquerdo */}
      {isBestSeller && (
        <span className="absolute -top-0.5 left-3 premium-badge bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30 flex items-center gap-1 z-10">
          <Star className="w-2.5 h-2.5 fill-white" />
          Mais vendido
        </span>
      )}
      {isGoodPrice && !isBestSeller && (
        <span className="absolute -top-0.5 left-3 premium-badge bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 z-10">
          Otimo preco
        </span>
      )}
      
      <div className="flex justify-between items-start gap-4 relative z-[1]">
        <div className="flex-1 pr-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-foreground text-base">{product.name}</h4>
              <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">Serve 1 pessoa</p>
            </div>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isFavorite
                    ? "text-red-500 bg-red-500/15"
                    : "text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10"
                }`}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart 
                  className={`w-4 h-4 transition-all duration-300 ${isFavorite ? "fill-red-500 scale-110" : "hover:scale-110"}`} 
                />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">
            {product.description}
          </p>
          <p className="text-xl font-black text-primary mt-3">
            {formatCurrency(product.price)}
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-secondary/40 backdrop-blur-sm rounded-2xl p-1.5">
          <button
            onClick={() => onUpdateQuantity(product.id, -1)}
            className="qty-btn w-10 h-10 bg-card/90 text-foreground hover:bg-primary/15 active:bg-primary active:text-primary-foreground"
            aria-label={`Diminuir quantidade de ${product.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-9 text-center font-black text-foreground tabular-nums text-lg">
            {quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(product.id, 1)}
            className="qty-btn w-10 h-10 bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 shadow-md shadow-primary/20"
            aria-label={`Aumentar quantidade de ${product.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
