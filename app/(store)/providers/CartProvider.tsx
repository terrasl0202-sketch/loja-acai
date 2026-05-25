"use client"

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react"
import { ADD_TOAST_DURATION } from "../constants"

// ============================================================
// CART PROVIDER
// Gerencia: carrinho, quantidades, toast de adicao, audio
// NAO gerencia: PIX, checkout, pedidos, APIs
// ============================================================

export interface AddToast {
  show: boolean
  productName: string
}

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface CartContextValue {
  // Quantidades
  quantities: Record<number, number>
  setQuantities: React.Dispatch<React.SetStateAction<Record<number, number>>>
  
  // Drawer
  showCart: boolean
  setShowCart: (show: boolean) => void
  
  // Acoes
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  
  // Calculos (precisam de products)
  getTotalItems: () => number
  getSubtotal: (products: Array<{ id: number; price: number }>) => number
  getCartItems: (products: Array<{ id: number; name: string; price: number }>) => CartItem[]
  getCartItemsText: (products: Array<{ id: number; name: string }>) => string
  
  // Toast de adicao
  addToast: AddToast
  
  // Audio
  playAddSound: () => void
  addToCartAudioRef: React.RefObject<HTMLAudioElement | null>
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCartContext() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCartContext must be used within a CartProvider")
  }
  return context
}

interface CartProviderProps {
  children: ReactNode
  products: Array<{ id: number; name: string; price: number }>
}

export function CartProvider({ children, products }: CartProviderProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [showCart, setShowCart] = useState(false)
  const [addToast, setAddToast] = useState<AddToast>({ show: false, productName: "" })
  const addToCartAudioRef = useRef<HTMLAudioElement | null>(null)

  const playAddSound = useCallback(() => {
    if (addToCartAudioRef.current) {
      addToCartAudioRef.current.currentTime = 0
      addToCartAudioRef.current.play().catch(() => {})
    }
  }, [])

  const updateQuantity = useCallback(
    (id: number, delta: number) => {
      setQuantities((prev) => {
        const newQty = Math.max(0, (prev[id] || 0) + delta)
        return {
          ...prev,
          [id]: newQty,
        }
      })
      
      if (delta > 0) {
        playAddSound()
        const product = products.find(p => p.id === id)
        if (product) {
          setAddToast({ show: true, productName: product.name })
          setTimeout(() => setAddToast({ show: false, productName: "" }), ADD_TOAST_DURATION)
        }
      }
    },
    [products, playAddSound]
  )

  const clearCart = useCallback(() => {
    setQuantities({})
  }, [])

  const getTotalItems = useCallback(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  }, [quantities])

  const getSubtotal = useCallback((prods: Array<{ id: number; price: number }>) => {
    return prods.reduce((total, product) => {
      return total + product.price * (quantities[product.id] || 0)
    }, 0)
  }, [quantities])

  const getCartItems = useCallback((prods: Array<{ id: number; name: string; price: number }>) => {
    return prods
      .filter((p) => quantities[p.id] > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: quantities[p.id],
        subtotal: p.price * quantities[p.id]
      }))
  }, [quantities])

  const getCartItemsText = useCallback((prods: Array<{ id: number; name: string }>) => {
    return prods
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join(", ")
  }, [quantities])

  const value: CartContextValue = {
    quantities,
    setQuantities,
    showCart,
    setShowCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getSubtotal,
    getCartItems,
    getCartItemsText,
    addToast,
    playAddSound,
    addToCartAudioRef,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
