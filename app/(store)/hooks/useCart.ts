"use client"

import { useState, useRef, useCallback } from "react"

export interface UseCartReturn {
  quantities: Record<number, number>
  showCart: boolean
  setShowCart: (show: boolean) => void
  updateQuantity: (id: number, delta: number) => void
  setQuantities: React.Dispatch<React.SetStateAction<Record<number, number>>>
  getTotalItems: () => number
  playAddSound: () => void
  addToCartAudioRef: React.RefObject<HTMLAudioElement | null>
}

export function useCart(onAddItem?: (productId: number) => void): UseCartReturn {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [showCart, setShowCart] = useState(false)
  const addToCartAudioRef = useRef<HTMLAudioElement | null>(null)

  const playAddSound = useCallback(() => {
    if (addToCartAudioRef.current) {
      addToCartAudioRef.current.currentTime = 0
      addToCartAudioRef.current.play().catch(() => {})
    }
  }, [])

  const updateQuantity = useCallback(
    (id: number, delta: number) => {
      const newQty = Math.max(0, (quantities[id] || 0) + delta)
      setQuantities((prev) => ({
        ...prev,
        [id]: newQty,
      }))
      if (delta > 0) {
        playAddSound()
        onAddItem?.(id)
      }
    },
    [quantities, playAddSound, onAddItem]
  )

  const getTotalItems = useCallback(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  }, [quantities])

  return {
    quantities,
    showCart,
    setShowCart,
    updateQuantity,
    setQuantities,
    getTotalItems,
    playAddSound,
    addToCartAudioRef,
  }
}
