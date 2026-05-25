"use client"

import { useState, useRef, useCallback } from "react"
import { ADD_TOAST_DURATION } from "../constants"

export interface AddToast {
  show: boolean
  productName: string
}

export interface UseCartOptions {
  products: Array<{ id: number; name: string; price: number }>
}

export interface UseCartReturn {
  // Estado do carrinho
  quantities: Record<number, number>
  setQuantities: React.Dispatch<React.SetStateAction<Record<number, number>>>
  
  // Drawer do carrinho
  showCart: boolean
  setShowCart: (show: boolean) => void
  
  // Acoes
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  
  // Calculos
  getTotalItems: () => number
  getSubtotal: () => number
  getCartItems: () => Array<{ id: number; name: string; price: number; quantity: number; subtotal: number }>
  getCartItemsText: () => string
  
  // Toast de adicao
  addToast: AddToast
  
  // Audio
  playAddSound: () => void
  addToCartAudioRef: React.RefObject<HTMLAudioElement | null>
}

export function useCart(options: UseCartOptions): UseCartReturn {
  const { products } = options
  
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
        // Mostrar toast de adicao
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

  const getSubtotal = useCallback(() => {
    return products.reduce((total, product) => {
      const price = product.price
      return total + price * (quantities[product.id] || 0)
    }, 0)
  }, [products, quantities])

  const getCartItems = useCallback(() => {
    return products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: quantities[p.id],
        subtotal: p.price * quantities[p.id]
      }))
  }, [products, quantities])

  const getCartItemsText = useCallback(() => {
    return products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join(", ")
  }, [products, quantities])

  return {
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
}
