"use client"

import { X, ShoppingCart } from "lucide-react"
import { CartItem } from "./CartItem"
import { CartFooter } from "./CartFooter"
import { EmptyCart } from "./EmptyCart"

interface CartProduct {
  id: number
  name: string
  price: number
}

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  products: CartProduct[]
  quantities: Record<number, number>
  onUpdateQuantity: (id: number, delta: number) => void
  subtotal: number
  deliveryFee?: number
  discount?: number
  total: number
  isStoreOpen: boolean
  onCheckout: () => void
}

export function CartDrawer({
  isOpen,
  onClose,
  products,
  quantities,
  onUpdateQuantity,
  subtotal,
  deliveryFee = 0,
  discount = 0,
  total,
  isStoreOpen,
  onCheckout
}: CartDrawerProps) {
  const cartItems = products.filter(p => (quantities[p.id] || 0) > 0)
  const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer - usa CSS variables do tema */}
      <div className="fixed inset-y-0 right-0 z-[95] w-full max-w-md bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Meu Carrinho</h2>
              <p className="text-xs text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-all text-secondary-foreground"
            aria-label="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        
        {/* Content */}
        {cartItems.length === 0 ? (
          <EmptyCart onClose={onClose} />
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
              {cartItems.map(product => (
                <CartItem
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  quantity={quantities[product.id] || 0}
                  onUpdateQuantity={onUpdateQuantity}
                />
              ))}
            </div>
            
            {/* Footer */}
            <CartFooter
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discount={discount}
              total={total}
              isStoreOpen={isStoreOpen}
              onCheckout={() => {
                onClose()
                onCheckout()
              }}
              onClose={onClose}
            />
          </>
        )}
      </div>
    </>
  )
}
