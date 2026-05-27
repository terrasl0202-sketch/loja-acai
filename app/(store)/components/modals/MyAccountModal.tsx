"use client"

import { X, User, Star, MapPin, Heart } from "lucide-react"
import type { Customer } from "../../types"

interface Product {
  id: number
  name: string
  price: number
}

interface MyAccountModalProps {
  customer: Customer
  products: Product[]
  onClose: () => void
}

export function MyAccountModal({ customer, products, onClose }: MyAccountModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Minha Conta</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info do cliente */}
          <div className="bg-secondary/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  {customer.name}
                  {customer.isVip && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500" /> VIP
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              </div>
            </div>
          </div>
          
          {/* Estatisticas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{customer.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Pedidos</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-500">
                R$ {customer.totalSpent.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">Total gasto</p>
            </div>
          </div>
          
          {/* Favoritos */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Favoritos ({customer.favorites.length})
            </h4>
            {customer.favorites.length > 0 ? (
              <div className="space-y-2">
                {customer.favorites.map(favId => {
                  const product = products.find(p => p.id === favId)
                  return product ? (
                    <div key={favId} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                      <span className="text-sm text-foreground">{product.name}</span>
                      <span className="text-sm text-primary font-medium">
                        R$ {product.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ) : null
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum favorito ainda</p>
            )}
          </div>
          
          {/* Endereco salvo */}
          {customer.savedAddress && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Endereco salvo
              </h4>
              <div className="bg-secondary/30 rounded-xl p-3">
                <p className="text-sm text-foreground">
                  {customer.savedAddress.endereco}, {customer.savedAddress.numero}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer.savedAddress.bairro}
                  {customer.savedAddress.referencia && ` - ${customer.savedAddress.referencia}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
